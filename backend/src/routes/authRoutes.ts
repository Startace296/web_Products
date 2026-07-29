// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { loginLimiter, registerLimiter } from "../middlewares/rateLimiter";
import { registerSchema, loginSchema } from "../validations/authValidation";
import * as authController from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/register", registerLimiter, validate(registerSchema), authController.register);
authRouter.post("/login", loginLimiter, validate(loginSchema), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", verifyToken, authController.me);
