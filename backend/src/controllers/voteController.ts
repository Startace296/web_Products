// Tầng: controller — CHỈ đọc req, gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { voteService } from "../services/voteService";
import type { ToggleVoteInput } from "../validations/voteValidation";

export const toggle = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.body as ToggleVoteInput;
  const result = await voteService.toggle(req.user!.id, req.params.id, type);
  res.status(200).json({ success: true, data: result });
});
