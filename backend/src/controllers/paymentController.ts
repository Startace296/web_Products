// Tầng: controller — CHỈ đọc req, gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { paymentService } from "../services/paymentService";

export const returnUrl = asyncHandler(async (req: Request, res: Response) => {
  const { redirectUrl } = await paymentService.handleReturn(req.query as Record<string, string>);
  res.redirect(302, redirectUrl);
});

export const ipn = asyncHandler(async (req: Request, res: Response) => {
  // VNPay gửi tham số qua query string dù merchant portal cấu hình IPN là GET hay
  // POST trong thực tế — gộp cả hai để không phụ thuộc cấu hình phía họ.
  const query = { ...(req.query as Record<string, string>), ...(req.body as Record<string, string>) };
  const result = await paymentService.handleIpn(query);
  res.status(200).json(result);
});
