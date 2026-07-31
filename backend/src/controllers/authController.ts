// Tầng: controller — CHỈ đọc req, gọi service, trả res. Không chứa business logic.
import { Request, Response } from "express";
import ms from "ms";
import { asyncHandler } from "../utils/asyncHandler";
import { authService } from "../services/authService";
import { otpService } from "../services/otpService";
import { env } from "../config/env";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const isProd = env.NODE_ENV === "production";

// sameSite: production triển khai FE (Vercel) và BE (Railway) trên 2 domain KHÁC
// NHAU (không cùng registrable domain) — trình duyệt coi đây là cross-site, và
// "strict"/"lax" đều chặn cookie trên request cross-site (kể cả fetch/XHR, không chỉ
// điều hướng trang). Chỉ "none" mới cho phép cookie gửi kèm, và spec bắt buộc "none"
// phải đi cùng secure:true. Nếu sau này FE/BE cùng root domain (vd: app.example.com +
// api.example.com), có thể siết lại "lax" để chống CSRF tốt hơn.
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "strict") as "none" | "strict",
  path: REFRESH_COOKIE_PATH,
  maxAge: ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue),
};

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email } = await authService.register(req.body);
  res.status(201).json({ success: true, data: { email } });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  await otpService.verify(req.body.email, req.body.code);
  res.status(200).json({ success: true, data: null });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  await otpService.resend(req.body.email);
  res.status(200).json({ success: true, data: null });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { user, accessToken } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // authService.refresh rotates the token (revokes the old one, issues a new one), so
  // the cookie must be re-set here too — not just on register/login.
  const { accessToken, refreshToken } = await authService.refresh(req.cookies?.[REFRESH_COOKIE_NAME]);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ success: true, data: { accessToken } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE_NAME]);
  // clearCookie phải khớp path/sameSite/secure với lúc set, nếu không 1 số trình
  // duyệt sẽ không nhận diện đúng cookie cần xoá.
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: REFRESH_COOKIE_PATH,
    sameSite: refreshCookieOptions.sameSite,
    secure: refreshCookieOptions.secure,
  });
  res.status(200).json({ success: true, data: null });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
});
