// Tầng: controller — CHỈ đọc req, gọi service, trả res. Không chứa business logic.
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { productService } from "../services/productService";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "../validations/productValidation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  // req.query đã được validate() coerce đúng shape ListProductsQuery ở route (xem productRoutes.ts).
  const result = await productService.listProducts(req.query as unknown as ListProductsQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug);
  res.status(200).json({ success: true, data: product });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body as CreateProductInput);
  res.status(201).json({ success: true, data: product });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id, req.body as UpdateProductInput);
  res.status(200).json({ success: true, data: product });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await productService.removeProduct(req.params.id);
  res.status(204).send();
});
