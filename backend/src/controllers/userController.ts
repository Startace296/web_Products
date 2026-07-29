// Tầng: controller — CHỈ đọc req, gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/userService";
import { ApiError } from "../utils/ApiError";

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("No file uploaded (field name must be 'avatar')");
  }

  const user = await userService.updateAvatar(req.user!.id, req.file.buffer);
  res.status(200).json({ success: true, data: user });
});
