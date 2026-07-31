// Tầng: service — component chỉ được gọi API product qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  brand: string | null;
  category: string;
  price: number;
  // NULL = không giảm giá. Chỉ hiện badge %/giá gạch ngang khi originalPrice > price
  // (xem ProductCard.tsx) — badge vẫn hoạt động đúng ngay cả khi backend trả dữ liệu
  // "vô lý" (originalPrice <= price) do defensive check ở phía hiển thị.
  originalPrice: number | null;
  stock: number;
  // Mảng có thứ tự (không phải object key-value) — xem lý do đầy đủ ở
  // backend/prisma/schema.prisma Product.specifications. NULL/[] đều nghĩa là "chưa có".
  specifications: ProductSpecification[] | null;
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
  originalPrice?: number;
  stock: number;
  specifications?: ProductSpecification[];
}

// originalPrice tách riêng khỏi Partial<CreateProductInput>: null có nghĩa "xoá giảm
// giá hiện có", khác với undefined ("không đổi") — Partial<> chỉ cho ra number|undefined.
export type UpdateProductInput = Partial<Omit<CreateProductInput, "originalPrice">> & {
  originalPrice?: number | null;
};

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
