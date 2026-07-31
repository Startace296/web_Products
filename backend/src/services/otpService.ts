// Layer: service — business logic cho xác thực OTP qua email. Throws ApiError trực tiếp
// (không đi qua authService) — cùng mô hình với paymentService tự ném lỗi độc lập dù
// orderService gọi nó như 1 collaborator.
import { randomInt } from "crypto";
import type { User } from "@prisma/client";
import { runInTransaction } from "../config/prisma";
import { otpRepository } from "../repositories/otpRepository";
import { userRepository } from "../repositories/userRepository";
import { hashToken } from "../utils/tokenHash";
import { sendMail } from "../utils/mailer";
import { ApiError } from "../utils/ApiError";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const generateCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, "0");

const buildEmailHtml = (name: string, code: string): string => `
  <p>Chào ${name},</p>
  <p>Mã xác thực TechPulse của bạn là:</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
  <p>Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
`;

const sendVerificationEmail = (email: string, name: string, code: string): Promise<void> => {
  return sendMail({
    to: email,
    subject: "Mã xác thực tài khoản TechPulse",
    html: buildEmailHtml(name, code),
  });
};

interface GeneratedOtp {
  codeHash: string;
  expiresAt: Date;
}

// Không đụng DB — chỉ sinh mã + gửi email, chỉ trả về (để bên gọi lưu) khi gửi thành công.
// Không cần userId ở bước này, nên authService.register dùng được hàm này TRƯỚC KHI User
// tồn tại (gửi email trước, tạo User + OtpCode cùng lúc trong 1 transaction sau khi gửi
// thành công — SMTP lỗi thì không để lại row mồ côi nào, client chỉ cần thử lại).
const generateAndSend = async (email: string, name: string): Promise<GeneratedOtp> => {
  const code = generateCode();

  try {
    await sendVerificationEmail(email, name, code);
  } catch {
    throw ApiError.internal("Failed to send verification email. Please try again later.");
  }

  return {
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  };
};

// User đã tồn tại (đường resend) — sinh mã, gửi, rồi mới lưu OtpCode.
const issueAndSend = async (user: User): Promise<void> => {
  const { codeHash, expiresAt } = await generateAndSend(user.email, user.name);
  await otpRepository.create({ userId: user.id, codeHash, expiresAt });
};

const verify = async (email: string, code: string): Promise<void> => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw ApiError.notFound("No account found for this email");
  }
  if (user.isVerified) {
    throw ApiError.badRequest("Email is already verified");
  }

  const otp = await otpRepository.findLatestActiveForUser(user.id);
  if (!otp) {
    throw ApiError.badRequest("No active OTP found. Please request a new code.");
  }
  if (otp.expiresAt < new Date()) {
    throw ApiError.badRequest("OTP has expired. Please request a new code.");
  }

  // So khớp mã TRƯỚC khi đụng tới attempts: nếu check attempts>=cap trước, lần thử thứ 6
  // (dù đúng) vẫn bị chặn oan — người dùng chỉ còn thực chất 4 lượt thay vì 5.
  if (hashToken(code) !== otp.codeHash) {
    const updated = await otpRepository.incrementAttempts(otp.id);
    if (updated.attempts >= OTP_MAX_ATTEMPTS) {
      await otpRepository.markConsumed(otp.id);
      throw ApiError.badRequest("Too many incorrect attempts. Please request a new code.");
    }
    throw ApiError.badRequest("Invalid OTP code");
  }

  await runInTransaction(async (tx) => {
    await otpRepository.markConsumed(otp.id, tx);
    await userRepository.markVerified(user.id, tx);
  });
};

const resend = async (email: string): Promise<void> => {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw ApiError.notFound("No account found for this email");
  }
  if (user.isVerified) {
    throw ApiError.badRequest("Email is already verified");
  }

  const latest = await otpRepository.findLatestActiveForUser(user.id);
  // Phòng thủ thêm ngoài rate limiter theo IP (otpResendLimiter) — limiter theo IP không
  // chặn được việc spam hộp thư của NẠN NHÂN từ nhiều IP/thiết bị khác nhau.
  if (latest && Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    throw ApiError.tooManyRequests("Please wait before requesting another code");
  }

  await issueAndSend(user);
};

export const otpService = {
  generateAndSend,
  issueAndSend,
  verify,
  resend,
};
