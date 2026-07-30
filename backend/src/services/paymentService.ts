// Tầng: service — nghiệp vụ thanh toán VNPay. handleIpn/handleReturn nói chuyện
// THẲNG với repository (không qua orderService) — orderService gọi ngược lại
// paymentService.createPaymentUrlForOrder để tạo URL, nên đi qua orderService ở chiều
// kia sẽ tạo import vòng.
import { runInTransaction } from "../config/prisma";
import { orderRepository, OrderWithItems } from "../repositories/orderRepository";
import { productRepository } from "../repositories/productRepository";
import { vnpay } from "../utils/vnpay";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

// Tín hiệu nội bộ để phân biệt "hết hàng đúng lúc IPN xác nhận" (rollback thanh toán
// này thành CANCELLED, coi là bình thường) với lỗi hệ thống thật sự (rethrow ở ngoài).
class OutOfStockError extends Error {}

const createPaymentUrlForOrder = (order: OrderWithItems, ipAddr: string): string => {
  if (!order.vnpTxnRef) {
    throw ApiError.internal("Order is missing a VNPay transaction reference");
  }

  return vnpay.buildPaymentUrl({
    txnRef: order.vnpTxnRef,
    amountVnd: order.totalAmount,
    // Tránh dấu tiếng Việt/ký tự đặc biệt trong vnp_OrderInfo theo khuyến cáo của VNPay.
    orderInfo: `Thanh toan don hang ${order.id}`,
    ipAddr,
  });
};

export interface VnpayReturnResult {
  redirectUrl: string;
}

// Browser redirect — CHỈ để UX (hiện banner thành công/thất bại ngay), KHÔNG phải
// nguồn xác nhận đáng tin cậy: người dùng có thể tắt tab trước khi redirect chạy, hoặc
// tự ghép URL return giả. Không đổi state Order ở đây — xem handleIpn.
const handleReturn = async (query: Record<string, string>): Promise<VnpayReturnResult> => {
  const { isValid, responseCode, txnRef } = vnpay.verify(query);

  if (!isValid || !txnRef) {
    return { redirectUrl: `${env.CLIENT_URL}/orders?payment=invalid` };
  }

  const order = await orderRepository.findByVnpTxnRef(txnRef);
  if (!order) {
    return { redirectUrl: `${env.CLIENT_URL}/orders?payment=invalid` };
  }

  const status = responseCode === "00" ? "success" : "failed";
  return { redirectUrl: `${env.CLIENT_URL}/orders/${order.id}?payment=${status}` };
};

export interface VnpayIpnResult {
  RspCode: string;
  Message: string;
}

// Server-to-server — nguồn xác nhận DUY NHẤT đáng tin cậy. Luôn trả 200 + đúng hợp đồng
// RspCode của VNPay (không bao giờ để lỗi rơi xuống errorHandler bình thường của app),
// vì VNPay sẽ RETRY nếu không nhận được response hợp lệ — idempotency check bên dưới
// (RspCode 02) là thứ khiến việc retry đó an toàn.
const handleIpn = async (query: Record<string, string>): Promise<VnpayIpnResult> => {
  try {
    const { isValid, responseCode, txnRef, amountVnd } = vnpay.verify(query);
    if (!isValid || !txnRef) {
      return { RspCode: "97", Message: "Invalid signature" };
    }

    const order = await orderRepository.findByVnpTxnRef(txnRef);
    if (!order) {
      return { RspCode: "01", Message: "Order not found" };
    }

    if (amountVnd !== order.totalAmount) {
      return { RspCode: "04", Message: "Invalid amount" };
    }

    if (order.status !== "PENDING_PAYMENT") {
      // VNPay gọi lại IPN (mạng chập chờn, hoặc merchant chưa kịp trả 200 lần trước) —
      // đơn đã được xử lý, xác nhận lại là "thành công" mà không làm gì thêm.
      return { RspCode: "02", Message: "Order already confirmed" };
    }

    if (responseCode === "00") {
      try {
        await runInTransaction(async (tx) => {
          for (const item of order.items) {
            if (!item.productId) continue; // Product gốc đã bị xoá — không còn gì để trừ kho.
            const affected = await productRepository.decrementStock(item.productId, item.quantity, tx);
            if (affected === 0) {
              throw new OutOfStockError(item.productName);
            }
          }
          await orderRepository.markPaid(order.id, tx);
        });
      } catch (err) {
        if (err instanceof OutOfStockError) {
          // Tiền đã về VNPay/merchant — không rollback được thanh toán ở bước này, chỉ
          // đánh dấu đơn CANCELLED để xử lý hoàn tiền thủ công qua VNPay (edge case hiếm:
          // 2 người mua cùng lúc trúng đúng đơn vị hàng cuối).
          await orderRepository.markFailed(order.id);
        } else {
          throw err;
        }
      }
    } else {
      await orderRepository.markFailed(order.id);
    }

    return { RspCode: "00", Message: "Confirm Success" };
  } catch {
    return { RspCode: "99", Message: "Unknown error" };
  }
};

export const paymentService = {
  createPaymentUrlForOrder,
  handleReturn,
  handleIpn,
};
