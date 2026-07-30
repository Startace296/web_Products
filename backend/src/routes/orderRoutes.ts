// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { orderLimiter } from "../middlewares/rateLimiter";
import { createOrderSchema, listOrdersQuerySchema, orderIdParamSchema } from "../validations/orderValidation";
import * as orderController from "../controllers/orderController";

export const orderRouter = Router();

// Đơn hàng gắn với tài khoản — toàn bộ router cần đăng nhập.
orderRouter.use(verifyToken);

orderRouter.post("/", orderLimiter, validate(createOrderSchema), orderController.create);
orderRouter.get("/", validate(listOrdersQuerySchema, "query"), orderController.list);
orderRouter.get("/:id", validate(orderIdParamSchema, "params"), orderController.getById);
