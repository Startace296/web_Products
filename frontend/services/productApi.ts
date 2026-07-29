// Tầng: service — component chỉ được gọi API product qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  brand: string | null;
  category: string;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
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

export interface ListProductsParams {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListProductsResult {
  items: Product[];
  pagination: Pagination;
}

export const productApi = {
  list: async (params: ListProductsParams = {}): Promise<ListProductsResult> => {
    const { data } = await api.get<ListEnvelope<Product>>("/products", { params });
    return { items: data.data, pagination: data.pagination };
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const { data } = await api.get<DetailEnvelope<Product>>(`/products/${slug}`);
    return data.data;
  },
};
