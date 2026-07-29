// Tầng: controller — CHỈ đọc req (params/query/body/user), gọi service, trả res.
// Không có if/throw nghiệp vụ ở đây — kể cả check quyền sở hữu cũng nằm trong reviewService.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { reviewService } from "../services/reviewService";
import type { CreateReviewInput, ListReviewsQuery, UpdateReviewInput } from "../validations/reviewValidation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.listByProduct(req.query as unknown as ListReviewsQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.getById(req.params.id);
  res.status(200).json({ success: true, data: review });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  // userId lấy từ req.user (JWT đã verify), KHÔNG bao giờ lấy từ req.body —
  // nếu không user A có thể tạo review đứng tên user B.
  const review = await reviewService.create(req.user!.id, req.body as CreateReviewInput);
  res.status(201).json({ success: true, data: review });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.update(req.user!.id, req.params.id, req.body as UpdateReviewInput);
  res.status(200).json({ success: true, data: review });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.remove(req.user!.id, req.params.id);
  res.status(204).send();
});
