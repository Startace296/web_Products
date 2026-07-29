// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
// Toàn bộ route đều cần verifyToken — notification luôn là dữ liệu riêng tư của user.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "../validations/notificationValidation";
import * as notificationController from "../controllers/notificationController";

export const notificationRouter = Router();

notificationRouter.get(
  "/",
  verifyToken,
  validate(listNotificationsQuerySchema, "query"),
  notificationController.list
);
notificationRouter.patch("/read-all", verifyToken, notificationController.markAllAsRead);
notificationRouter.patch(
  "/:id/read",
  verifyToken,
  validate(notificationIdParamSchema, "params"),
  notificationController.markAsRead
);
