// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { writeActionLimiter } from "../middlewares/rateLimiter";
import { addCartItemSchema, cartItemParamSchema, updateCartItemSchema } from "../validations/cartValidation";
import * as cartController from "../controllers/cartController";

export const cartRouter = Router();

// Giỏ hàng gắn với tài khoản — không có route đọc công khai, toàn bộ router cần đăng nhập.
cartRouter.use(verifyToken);

cartRouter.get("/", cartController.get);
cartRouter.post("/items", writeActionLimiter, validate(addCartItemSchema), cartController.addItem);
cartRouter.patch(
  "/items/:productId",
  validate(cartItemParamSchema, "params"),
  validate(updateCartItemSchema),
  cartController.updateItem
);
cartRouter.delete("/items/:productId", validate(cartItemParamSchema, "params"), cartController.removeItem);
