// Tầng: service — component chỉ được gọi API cart qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  category: string;
  price: number;
  stock: number;
  quantity: number;
  subtotal: number;
}

export interface CartSummary {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

interface DetailEnvelope<T> {
  success: boolean;
  data: T;
}

export const cartApi = {
  get: async (): Promise<CartSummary> => {
    const { data } = await api.get<DetailEnvelope<CartSummary>>("/cart");
    return data.data;
  },

  addItem: async (productId: string, quantity = 1): Promise<CartSummary> => {
    const { data } = await api.post<DetailEnvelope<CartSummary>>("/cart/items", { productId, quantity });
    return data.data;
  },

  // quantity = 0 xoá item khỏi giỏ (khớp hành vi PATCH /cart/items/:productId ở backend).
  updateItem: async (productId: string, quantity: number): Promise<CartSummary> => {
    const { data } = await api.patch<DetailEnvelope<CartSummary>>(`/cart/items/${productId}`, { quantity });
    return data.data;
  },

  removeItem: async (productId: string): Promise<CartSummary> => {
    const { data } = await api.delete<DetailEnvelope<CartSummary>>(`/cart/items/${productId}`);
    return data.data;
  },
};
