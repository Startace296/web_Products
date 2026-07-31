// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { newsletterLimiter } from "../middlewares/rateLimiter";
import { subscribeNewsletterSchema } from "../validations/newsletterValidation";
import * as newsletterController from "../controllers/newsletterController";

export const newsletterRouter = Router();

newsletterRouter.post(
  "/subscribe",
  newsletterLimiter,
  validate(subscribeNewsletterSchema),
  newsletterController.subscribe
);
