// Tầng: controller — CHỈ đọc req, gọi service, trả res. Không chứa business logic.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { newsletterService } from "../services/newsletterService";

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  await newsletterService.subscribe(req.body);
  res.status(201).json({ success: true, data: null });
});
