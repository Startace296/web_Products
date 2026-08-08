// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import {
  loginLimiter,
  loginEmailLimiter,
  registerLimiter,
  otpVerifyLimiter,
  otpVerifyEmailLimiter,
  otpResendLimiter,
  otpResendEmailLimiter,
} from "../middlewares/rateLimiter";
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } from "../validations/authValidation";
import * as authController from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, validate(registerSchema), authController.register);
authRouter.post("/login", loginLimiter, loginEmailLimiter, validate(loginSchema), authController.login);
authRouter.post(
  "/verify-otp",
  otpVerifyLimiter,
  otpVerifyEmailLimiter,
  validate(verifyOtpSchema),
  authController.verifyOtp
);
authRouter.post(
  "/resend-otp",
  otpResendLimiter,
  otpResendEmailLimiter,
  validate(resendOtpSchema),
  authController.resendOtp
);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", verifyToken, authController.me);
