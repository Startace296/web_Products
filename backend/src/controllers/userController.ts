// Layer: controller — reads req, calls service, returns res. No business logic here.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { userService } from "../services/userService";

export const uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateAvatar(req.user!.id, req.file?.buffer);
  res.status(200).json({ success: true, data: user });
});
