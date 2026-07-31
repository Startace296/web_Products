// Tầng: config — cấu hình nodemailer transporter 1 lần duy nhất, dùng chung qua utils/mailer.ts.
import nodemailer from "nodemailer";
import { env } from "./env";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  // SMTP treo (host sai/không tới được) không được phép làm request đăng ký/gửi lại
  // OTP treo vô thời hạn — fail nhanh thay vì chờ default timeout rất dài của nodemailer.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});
