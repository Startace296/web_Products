// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { writeActionLimiter } from "../middlewares/rateLimiter";
import { createCommentSchema, listCommentsQuerySchema } from "../validations/commentValidation";
import * as commentController from "../controllers/commentController";

export const commentRouter = Router();

commentRouter.get("/", validate(listCommentsQuerySchema, "query"), commentController.list);
commentRouter.post("/", verifyToken, writeActionLimiter, validate(createCommentSchema), commentController.create);
