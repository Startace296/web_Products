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
};
