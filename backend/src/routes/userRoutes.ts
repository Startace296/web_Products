// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { verifyToken } from "../middlewares/verifyToken";
import { uploadAvatar as uploadAvatarMiddleware } from "../middlewares/upload";
import { uploadLimiter } from "../middlewares/rateLimiter";
import * as userController from "../controllers/userController";

export const userRouter = Router();

// Thứ tự: auth (rẻ nhất) -> rate limit -> multer parse file (đắt hơn: đọc/giữ buffer
// trong RAM) -> controller. Multer's fileFilter/limits lỗi sẽ next(err) tới errorHandler.
userRouter.post("/me/avatar", verifyToken, uploadLimiter, uploadAvatarMiddleware, userController.uploadAvatar);
