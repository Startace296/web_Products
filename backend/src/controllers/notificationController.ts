// Tầng: controller — CHỈ đọc req, gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { notificationService } from "../services/notificationService";
import type { ListNotificationsQuery } from "../validations/notificationValidation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as ListNotificationsQuery;
  // recipientId LUÔN là req.user (JWT đã verify) — không nhận từ query/param, mỗi
  // user chỉ xem được thông báo của chính mình.
  const result = await notificationService.listByRecipient(req.user!.id, page, limit);
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    unreadCount: result.unreadCount,
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAsRead(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: null });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);
  res.status(200).json({ success: true, data: null });
});
