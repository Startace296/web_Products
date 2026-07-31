// Tầng: validation — Zod schema, dùng chung cho middlewares/validate.ts.
import { z } from "zod";

export const subscribeNewsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  // Cùng regex với orderValidation.recipientPhone — giữ 1 chuẩn số điện thoại VN trong
  // toàn bộ app. Optional: khác với đăng ký tài khoản, form marketing này chỉ bắt buộc email.
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, "Invalid Vietnamese phone number")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;
