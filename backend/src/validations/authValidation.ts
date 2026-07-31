// Tầng: validation — Zod schema, dùng chung cho middlewares/validate.ts.
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  // bcrypt chỉ dùng 72 byte đầu của password, dài hơn sẽ bị âm thầm cắt bớt
  // (bug bảo mật kinh điển) — chặn ở đây để user biết ngay thay vì đăng nhập sai khó hiểu sau này.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  code: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
