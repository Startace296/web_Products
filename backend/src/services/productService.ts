// Tầng: service — business logic Product. Không import Express.
import { productRepository } from "../repositories/productRepository";
import { ApiError } from "../utils/ApiError";
import type { ListProductsQuery } from "../validations/productValidation";
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
  const { category, search, page, limit } = query;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    productRepository.findMany({ category, search, skip, take: limit }),
    productRepository.count(category, search),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getProductBySlug = async (slug: string): Promise<Product> => {
  const product = await productRepository.findBySlug(slug);
  if (!product) {
    throw ApiError.notFound("Product not found");
  }
  return product;
};

export const productService = {
  listProducts,
  getProductBySlug,
};
