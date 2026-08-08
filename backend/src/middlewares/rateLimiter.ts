// Tầng: middleware — chặn brute-force / spam trên các route ghi dữ liệu nhạy cảm.
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError";

const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // trả RateLimit-* header để client biết còn bao nhiêu lượt
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });

// Giới hạn theo IP. Đủ cho MVP; nếu deploy sau proxy/load balancer phải
// set app.set("trust proxy", ...) trong app.ts, nếu không req.ip sẽ luôn là
// IP của proxy và rate limit áp dụng sai (dồn tất cả user vào chung 1 IP).
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again in 15 minutes."
);

export const registerLimiter = createRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many accounts created from this IP. Please try again later."
);

// Review/comment creation không có limiter nào từ bước 4/8 tới giờ — audit ở bước 10
// phát hiện khoảng trống này, thêm để chặn bot spam nội dung.
export const writeActionLimiter = createRateLimiter(
  15 * 60 * 1000,
  30,
  "Too many actions. Please slow down and try again later."
);

// Upload tốn chi phí Cloudinary + băng thông hơn hẳn 1 request thường — giới hạn chặt hơn.
export const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  10,
  "Too many uploads. Please try again later."
);

// Đặt hàng là write-action như review/comment, nhưng còn có thể gọi ra cổng thanh toán
// ngoài (VNPay) — tách giới hạn riêng thay vì dùng chung writeActionLimiter.
export const orderLimiter = createRateLimiter(
  15 * 60 * 1000,
  20,
  "Too many order attempts. Please slow down and try again later."
);

// Endpoint public, không yêu cầu đăng nhập — cần chặn spam riêng như register.
export const newsletterLimiter = createRateLimiter(
  60 * 60 * 1000,
  8,
  "Too many attempts. Please try again later."
);

// Dò mã OTP — bản chất là brute-force nhắm vào 1 mã 6 chữ số, cùng mức độ nhạy cảm với
// loginLimiter (dò mật khẩu).
export const otpVerifyLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many OTP attempts. Please try again later."
);

// Cùng mức với registerLimiter — mỗi lần gọi tốn 1 email SMTP thật.
export const otpResendLimiter = createRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many OTP resend requests. Please try again later."
);

// Khoá theo email trong body thay vì IP — các limiter phía trên đều đếm theo req.ip nên
// một kẻ tấn công đổi IP liên tục (proxy xoay vòng, botnet, nhiều thiết bị) vẫn né được
// hoàn toàn, miễn là mỗi IP không vượt ngưỡng riêng của nó. Đếm theo email chặn đúng vào
// tài khoản/nạn nhân bị nhắm tới bất kể request đến từ bao nhiêu IP khác nhau.
// Bỏ qua (skip) khi body chưa có email hợp lệ: validate(schema) chạy SAU middleware này
// trong route, nên request thiếu/sai kiểu email vẫn lọt tới đây — gộp chung các request đó
// vào 1 bucket "unknown" sẽ vô tình rate-limit chéo giữa các client không liên quan gì
// nhau. IP limiter ở trên + Zod validation phía sau đã đủ xử lý case thiếu email.
const createEmailRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => typeof req.body?.email !== "string" || req.body.email.trim() === "",
    keyGenerator: (req) => req.body.email.trim().toLowerCase(),
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });

// Dò mật khẩu nhắm vào 1 tài khoản cụ thể nhưng rải request qua nhiều IP sẽ né được
// loginLimiter (theo IP) — khoá thêm theo email để giới hạn tổng số lần thử trên tài
// khoản đó bất kể nguồn IP.
export const loginEmailLimiter = createEmailRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts for this account. Please try again in 15 minutes."
);

// Dò mã OTP rải qua nhiều IP nhắm vào cùng 1 email sẽ né được otpVerifyLimiter (theo IP),
// dù mỗi mã OTP đã tự giới hạn 5 lần thử sai trước khi bị huỷ (xem otpService.verify) —
// khoá thêm theo email để chặn việc dò nhiều mã OTP liên tiếp (mỗi mã 5 lần) từ nhiều IP.
export const otpVerifyEmailLimiter = createEmailRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many OTP attempts for this account. Please try again later."
);

// Spam email OTP vào hộp thư nạn nhân từ nhiều IP khác nhau sẽ né được otpResendLimiter
// (theo IP). Cooldown 60s trong otpService.resend chỉ chặn gọi dồn dập liên tiếp, không
// giới hạn tổng số lượt trong 1 giờ — khoá thêm theo email để chặn đúng việc "bơm" email
// vào một hộp thư cụ thể.
export const otpResendEmailLimiter = createEmailRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many OTP resend requests for this account. Please try again later."
);
