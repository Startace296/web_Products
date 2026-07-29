// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { writeActionLimiter } from "../middlewares/rateLimiter";
import {
  createReviewSchema,
  listReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "../validations/reviewValidation";
import * as reviewController from "../controllers/reviewController";

export const reviewRouter = Router();

// Đọc: public, không cần đăng nhập.
reviewRouter.get("/", validate(listReviewsQuerySchema, "query"), reviewController.list);
reviewRouter.get("/:id", validate(reviewIdParamSchema, "params"), reviewController.getById);

// Ghi: cần verifyToken. verifyToken đứng trước validate để chặn request chưa đăng nhập
// sớm nhất có thể, trước khi tốn công parse Zod.
reviewRouter.post("/", verifyToken, writeActionLimiter, validate(createReviewSchema), reviewController.create);
reviewRouter.patch(
  "/:id",
  verifyToken,
  validate(reviewIdParamSchema, "params"),
  validate(updateReviewSchema),
  reviewController.update
);
reviewRouter.delete("/:id", verifyToken, validate(reviewIdParamSchema, "params"), reviewController.remove);
