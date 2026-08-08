// Tầng: service — business logic Product. Không import Express.
import { productRepository } from "../repositories/productRepository";
import { ApiError } from "../utils/ApiError";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "../validations/productValidation";
import type { Product } from "@prisma/client";

interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const listProducts = async (query: ListProductsQuery): Promise<PaginatedResult<Product>> => {
  const { category, search, minPrice, maxPrice, page, limit, sortBy } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    productRepository.findMany({ category, search, minPrice, maxPrice, sortBy, skip, take: limit }),
    productRepository.count({ category, search, minPrice, maxPrice }),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getPriceRange = (): Promise<{ min: number; max: number }> => {
  return productRepository.getPriceRange();
};

const getProductBySlug = async (slug: string): Promise<Product> => {
  const product = await productRepository.findBySlug(slug);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  return product;
};

const createProduct = async (input: CreateProductInput): Promise<Product> => {
  const existing = await productRepository.findBySlug(input.slug);
  if (existing) {
    throw ApiError.conflict("Slug is already in use");
  }
  return productRepository.create(input);
};

const updateProduct = async (id: string, input: UpdateProductInput): Promise<Product> => {
  const existing = await productRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound("Product not found");
  }

  if (input.slug && input.slug !== existing.slug) {
    const slugOwner = await productRepository.findBySlug(input.slug);
    if (slugOwner) {
      throw ApiError.conflict("Slug is already in use");
    }
  }

  // Zod (updateProductSchema) chỉ validate được các field THỰC SỰ gửi lên trong payload
  // này — không biết state hiện có trong DB. Nếu admin chỉ sửa 1 trong 2 field
  // (price hoặc originalPrice), phải tự ráp giá trị hiệu lực SAU KHI merge với dữ liệu
  // cũ để so sánh, tránh lọt trạng thái vô lý (originalPrice <= price).
  const effectivePrice = input.price ?? existing.price;
  const effectiveOriginalPrice = input.originalPrice === undefined ? existing.originalPrice : input.originalPrice;
  if (effectiveOriginalPrice !== null && effectiveOriginalPrice <= effectivePrice) {
    throw ApiError.badRequest("Original price must be greater than price");
  }

  return productRepository.update(id, input);
};

const removeProduct = async (id: string): Promise<void> => {
  const existing = await productRepository.findById(id);
  if (!existing) {
    throw ApiError.notFound("Product not found");
  }

  // Cascade ở schema: xoá Product sẽ xoá theo TOÀN BỘ Review (và Vote/Comment/
  // Notification liên quan tới các review đó) + gỡ khỏi CartItem của mọi user đang có
  // sản phẩm này trong giỏ. OrderItem thì an toàn (onDelete: SetNull, đã tự snapshot
  // tên/giá — xem orderService), nhưng phần Review là MẤT THẬT, không phục hồi được.
  // Hàm này không cảnh báo/chặn việc đó — nếu cần giữ review khi ngừng bán, nên cân
  // nhắc "soft delete" (thêm cờ ẩn sản phẩm) thay vì xoá cứng như hiện tại.
  await productRepository.remove(id);
};

export const productService = {
  listProducts,
  getPriceRange,
  getProductBySlug,
  createProduct,
  updateProduct,
  removeProduct,
};
