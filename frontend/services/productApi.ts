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
  price: number;
  stock: number;
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

export type ProductSortBy = "newest" | "reviewCount" | "rating";

export interface ListProductsParams {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: ProductSortBy;
}

export interface ListProductsResult {
  items: Product[];
  pagination: Pagination;
}

// avgRating/reviewCount không nằm trong input tạo/sửa — field denormalize, chỉ backend
// (reviewService) được quyền ghi, khớp với createProductSchema/updateProductSchema.
export interface CreateProductInput {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  brand?: string;
  category: string;
  price: number;
  stock: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const productApi = {
  list: async (params: ListProductsParams = {}): Promise<ListProductsResult> => {
    const { data } = await api.get<ListEnvelope<Product>>("/products", { params });
    return { items: data.data, pagination: data.pagination };
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const { data } = await api.get<DetailEnvelope<Product>>(`/products/${slug}`);
    return data.data;
  },

  // 3 hàm dưới đây chỉ ADMIN mới gọi được — backend enforce bằng requireRole("ADMIN"),
  // đây chỉ là lớp gọi API, không tự kiểm tra quyền (xem ProtectedRoute requireRole ở FE).
  create: async (input: CreateProductInput): Promise<Product> => {
    const { data } = await api.post<DetailEnvelope<Product>>("/products", input);
    return data.data;
  },

  update: async (id: string, input: UpdateProductInput): Promise<Product> => {
    const { data } = await api.patch<DetailEnvelope<Product>>(`/products/${id}`, input);
    return data.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
