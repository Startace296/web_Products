// Tầng: controller — CHỈ đọc req, gọi service, trả res. Không chứa business logic.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { productService } from "../services/productService";
import type { ListProductsQuery } from "../validations/productValidation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  // req.query đã được validate() coerce đúng shape ListProductsQuery ở route (xem productRoutes.ts).
  const result = await productService.listProducts(req.query as unknown as ListProductsQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug);
  res.status(200).json({ success: true, data: product });
});
