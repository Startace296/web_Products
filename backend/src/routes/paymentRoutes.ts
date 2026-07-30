// Tầng: route — chỉ khai báo path + middleware, không có logic.
// Không verifyToken: /return là browser redirect không mang JWT của app này, /ipn là
// gọi server-to-server từ VNPay — cả hai xác thực bằng chữ ký HMAC (vnp_SecureHash,
// xem utils/vnpay.ts), không phải JWT.
import { Router } from "express";
import * as paymentController from "../controllers/paymentController";

export const paymentRouter = Router();

paymentRouter.get("/return", paymentController.returnUrl);
// Đăng ký cả GET lẫn POST cho /ipn — merchant portal của VNPay có thể cấu hình 1 trong 2.
paymentRouter.get("/ipn", paymentController.ipn);
paymentRouter.post("/ipn", paymentController.ipn);
