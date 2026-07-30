// Tầng: service — business logic Order. Đặt hàng chạy trong 1 transaction: đọc giỏ,
// snapshot giá hiện tại (Product.price có thể đổi sau, đơn hàng cũ không đổi theo —
// cùng triết lý denormalize như Review.upvoteCount/Product.avgRating), tạo Order+
// OrderItem, xử lý kho, xoá giỏ — tất cả cùng thành công hoặc cùng rollback.
//
// COD và VNPAY xử lý kho khác nhau NGAY TỪ LÚC TẠO ĐƠN:
// - COD: trừ kho thật, atomic, trong chính transaction này — không có bước "chờ xác
//   nhận" nào nên trừ luôn, status = CONFIRMED.
// - VNPAY: chỉ soft-check (đọc thường, không atomic) để báo lỗi sớm trước khi đưa
//   người dùng sang cổng thanh toán — trừ kho THẬT dời tới lúc IPN xác nhận đã thanh
//   toán (xem paymentService.handleIpn), vì redirect trình duyệt về /return KHÔNG phải
//   nguồn đáng tin cậy (người dùng có thể tắt tab, hoặc tự ghép URL return giả).
//   status = PENDING_PAYMENT.
// Giỏ hàng được xoá ngay lập tức cho CẢ HAI phương thức — việc này không có rủi ro
// tài chính/tồn kho (tệ nhất là phải thêm lại giỏ nếu bỏ dở thanh toán VNPay), khác
// hẳn với trừ kho.
import { runInTransaction } from "../config/prisma";
import { cartRepository } from "../repositories/cartRepository";
import { orderRepository, OrderWithItems } from "../repositories/orderRepository";
import { productRepository } from "../repositories/productRepository";
import { paymentService } from "./paymentService";
import { ApiError } from "../utils/ApiError";
import type { CreateOrderInput, ListOrdersQuery } from "../validations/orderValidation";

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateOrderResult {
  order: OrderWithItems;
  // Chỉ có khi paymentMethod === "VNPAY" — frontend redirect sang đây để thanh toán.
  paymentUrl?: string;
}

const create = async (userId: string, input: CreateOrderInput, ipAddr: string): Promise<CreateOrderResult> => {
  const order = await runInTransaction(async (tx) => {
    const cartItems = await cartRepository.findManyByUser(userId, tx);
    if (cartItems.length === 0) {
      throw ApiError.badRequest("Cart is empty");
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const created = await orderRepository.create(
      {
        userId,
        paymentMethod: input.paymentMethod,
        status: input.paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT",
        totalAmount,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        shippingAddress: input.shippingAddress,
        note: input.note,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.imageUrl,
        })),
      },
      tx
    );

    if (input.paymentMethod === "COD") {
      // Trừ kho có điều kiện, ngay trong tx — nếu bất kỳ dòng nào không đủ hàng, ném lỗi
      // để rollback TOÀN BỘ order (không tạo đơn thiếu hàng cho các dòng đã trừ trước đó).
      for (const item of cartItems) {
        const affected = await productRepository.decrementStock(item.productId, item.quantity, tx);
        if (affected === 0) {
          throw ApiError.conflict(`"${item.product.name}" không còn đủ hàng trong kho`);
        }
      }
      await cartRepository.clearByUser(userId, tx);
      return created;
    }

    for (const item of cartItems) {
      if (item.quantity > item.product.stock) {
        throw ApiError.conflict(`"${item.product.name}" không còn đủ hàng trong kho`);
      }
    }
    await cartRepository.clearByUser(userId, tx);

    return orderRepository.setVnpTxnRef(created.id, `${created.id}-1`, tx);
  });

  if (order.paymentMethod !== "VNPAY") {
    return { order };
  }

  const paymentUrl = paymentService.createPaymentUrlForOrder(order, ipAddr);
  return { order, paymentUrl };
};

const listByUser = async (userId: string, query: ListOrdersQuery): Promise<PaginatedResult<OrderWithItems>> => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    orderRepository.findManyByUser({ userId, skip, take: limit }),
    orderRepository.countByUser(userId),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getById = async (userId: string, orderId: string): Promise<OrderWithItems> => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw ApiError.notFound("Order not found");
  }
  // Kiểm tra quyền sở hữu ở service (không phải controller) — cùng pattern reviewService.update.
  if (order.userId !== userId) {
    throw ApiError.forbidden("You can only view your own orders");
  }
  return order;
};

export const orderService = {
  create,
  listByUser,
  getById,
};
