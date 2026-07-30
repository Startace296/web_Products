// Tầng: controller — CHỈ đọc req (params/query/body/user), gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { orderService } from "../services/orderService";
import type { CreateOrderInput, ListOrdersQuery } from "../validations/orderValidation";

export const create = asyncHandler(async (req: Request, res: Response) => {
  // req.ip cần app.set("trust proxy", 1) đúng ở prod (đã có trong app.ts) để không
  // luôn nhận IP của reverse proxy — vnp_IpAddr chỉ phục vụ log/chống gian lận phía
  // VNPay, không có fallback nào là "đúng tuyệt đối" nên "127.0.0.1" là đủ cho dev.
  const result = await orderService.create(req.user!.id, req.body as CreateOrderInput, req.ip ?? "127.0.0.1");
  res.status(201).json({ success: true, data: result });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.listByUser(req.user!.id, req.query as unknown as ListOrdersQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getById(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: order });
});
