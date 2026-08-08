// Tầng: service — component chỉ được gọi API order qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "COD" | "VNPAY";
export type PaymentStatus = "UNPAID" | "PAID" | "FAILED";

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note: string | null;
  vnpTxnRef: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderInput {
  paymentMethod: PaymentMethod;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note?: string;
}

export interface CreateOrderResult {
  order: Order;
  // Chỉ có khi paymentMethod === "VNPAY" — điều hướng sang đây để thanh toán.
  paymentUrl?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ListEnvelope<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

interface DetailEnvelope<T> {
  success: boolean;
  data: T;
}

export interface ListOrdersParams {
  page?: number;
  limit?: number;
}

export interface ListOrdersResult {
  items: Order[];
  pagination: Pagination;
}

// Đơn hàng của bất kỳ ai, kèm thông tin người mua — chỉ admin mới thấy được (xem
// orderRepository.orderAdminSelect ở backend).
export interface AdminOrder extends Order {
  user: { id: string; name: string; email: string };
}

export interface AdminListOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export interface AdminListOrdersResult {
  items: AdminOrder[];
  pagination: Pagination;
}

// Không gồm "PENDING_PAYMENT" — trạng thái đó chỉ đổi tự động qua IPN VNPay, admin
// không được set thủ công (xem updateOrderStatusSchema ở backend).
export type UpdatableOrderStatus = Exclude<OrderStatus, "PENDING_PAYMENT">;

export const orderApi = {
  create: async (input: CreateOrderInput): Promise<CreateOrderResult> => {
    const { data } = await api.post<DetailEnvelope<CreateOrderResult>>("/orders", input);
    return data.data;
  },

  list: async (params: ListOrdersParams = {}): Promise<ListOrdersResult> => {
    const { data } = await api.get<ListEnvelope<Order>>("/orders", { params });
    return { items: data.data, pagination: data.pagination };
  },

  getById: async (id: string): Promise<Order> => {
    const { data } = await api.get<DetailEnvelope<Order>>(`/orders/${id}`);
    return data.data;
  },

  adminList: async (params: AdminListOrdersParams = {}): Promise<AdminListOrdersResult> => {
    const { data } = await api.get<ListEnvelope<AdminOrder>>("/orders/admin", { params });
    return { items: data.data, pagination: data.pagination };
  },

  updateStatus: async (id: string, status: UpdatableOrderStatus): Promise<Order> => {
    const { data } = await api.patch<DetailEnvelope<Order>>(`/orders/admin/${id}/status`, { status });
    return data.data;
  },
};
