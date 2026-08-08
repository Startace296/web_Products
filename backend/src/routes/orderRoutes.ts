// Tầng: route — chỉ khai báo path + middleware chain, không chứa logic.
import { Router } from "express";
import { validate } from "../middlewares/validate";
import { verifyToken } from "../middlewares/verifyToken";
import { requireRole } from "../middlewares/requireRole";
import { orderLimiter } from "../middlewares/rateLimiter";
import {
  adminListOrdersQuerySchema,
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "../validations/orderValidation";
import * as orderController from "../controllers/orderController";

export const orderRouter = Router();

// Đơn hàng gắn với tài khoản — toàn bộ router cần đăng nhập.
orderRouter.use(verifyToken);

orderRouter.post("/", orderLimiter, validate(createOrderSchema), orderController.create);
orderRouter.get("/", validate(listOrdersQuerySchema, "query"), orderController.list);

// "/admin" và "/admin/:id/status" PHẢI đăng ký TRƯỚC "/:id" bên dưới — Express khớp
// route theo thứ tự đăng ký, "/:id" (GET) đứng trước sẽ nuốt luôn "/admin" (coi
// "admin" là giá trị :id) trước khi request kịp tới route admin thật.
orderRouter.get(
  "/admin",
  requireRole("ADMIN"),
  validate(adminListOrdersQuerySchema, "query"),
  orderController.adminList
);
orderRouter.patch(
  "/admin/:id/status",
  requireRole("ADMIN"),
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  orderController.updateStatus
);

// getById cho phép cả chủ đơn lẫn ADMIN — quyền sở hữu được kiểm tra trong
// orderService.getById, không phải ở đây (cùng pattern các route đọc khác trong router này).
orderRouter.get("/:id", validate(orderIdParamSchema, "params"), orderController.getById);
