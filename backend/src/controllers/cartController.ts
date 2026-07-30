// Tầng: controller — CHỈ đọc req (params/body/user), gọi service, trả res.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { cartService } from "../services/cartService";
import type { AddCartItemInput, UpdateCartItemInput } from "../validations/cartValidation";

export const get = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id);
  res.status(200).json({ success: true, data: cart });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addItem(req.user!.id, req.body as AddCartItemInput);
  res.status(201).json({ success: true, data: cart });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.updateItem(req.user!.id, req.params.productId, req.body as UpdateCartItemInput);
  res.status(200).json({ success: true, data: cart });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeItem(req.user!.id, req.params.productId);
  res.status(200).json({ success: true, data: cart });
});
