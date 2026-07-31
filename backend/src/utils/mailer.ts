// Tầng: utils — wrapper mỏng quanh nodemailer, tương tự utils/cloudinary.ts wrap Cloudinary SDK.
import { mailer } from "../config/mailer";
import { env } from "../config/env";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async ({ to, subject, html }: SendMailInput): Promise<void> => {
  try {
    await mailer.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    // Lỗi SMTP thật (vd: "535-5.7.8 Username and Password not accepted") vô nghĩa với
    // người dùng cuối — log lại để dev tự debug .env, ném ra message chung chung để gọi phía trên tự quyết định ApiError phù hợp.
    console.error("[mailer] Failed to send email:", err);
    throw new Error("Failed to send email", { cause: err });
  }
};
