// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { listProductsQuerySchema } from "../validations/productValidation";
import * as productController from "../controllers/productController";

export const productRouter = Router();

productRouter.get("/", validate(listProductsQuerySchema, "query"), productController.list);
productRouter.get("/:slug", productController.getBySlug);
