// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
// Mount cùng prefix "/reviews" với reviewRoutes.ts (xem routes/index.ts) — path
// "/:id/votes" không đụng với "/", "/:id" của reviewRouter nên mount chung an toàn.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { reviewIdParamSchema } from "../validations/reviewValidation";
import { toggleVoteSchema } from "../validations/voteValidation";
import * as voteController from "../controllers/voteController";

export const voteRouter = Router();

voteRouter.post(
  "/:id/votes",
  verifyToken,
  validate(reviewIdParamSchema, "params"),
  validate(toggleVoteSchema),
  voteController.toggle
);
