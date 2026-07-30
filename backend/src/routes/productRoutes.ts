// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { requireRole } from "../middlewares/requireRole";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "../validations/productValidation";
import * as productController from "../controllers/productController";

export const productRouter = Router();

// Đọc: public, không cần đăng nhập.
productRouter.get("/", validate(listProductsQuerySchema, "query"), productController.list);
productRouter.get("/:slug", productController.getBySlug);

// Ghi: chỉ ADMIN. verifyToken đứng trước requireRole (cần req.user trước khi check
// role), cả hai đứng trước validate để chặn request không đủ quyền sớm nhất, trước khi
// tốn công parse Zod.
productRouter.post(
  "/",
  verifyToken,
  requireRole("ADMIN"),
  validate(createProductSchema),
  productController.create
);
productRouter.patch(
  "/:id",
  verifyToken,
  requireRole("ADMIN"),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  productController.update
);
productRouter.delete(
  "/:id",
  verifyToken,
  requireRole("ADMIN"),
  validate(productIdParamSchema, "params"),
  productController.remove
);
