// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Product.
import { prisma } from "../config/prisma";
import type { Prisma, Product } from "@prisma/client";

// Chấp nhận cả PrismaClient singleton lẫn transaction client (tx), để service có
// thể gộp cập nhật Product vào cùng transaction với Review (xem reviewService).
type DbClient = Prisma.TransactionClient | typeof prisma;

export type ProductSortBy = "newest" | "reviewCount" | "rating";

interface FindManyParams {
  category?: string;
  search?: string;
  sortBy?: ProductSortBy;
  skip: number;
  take: number;
}

// Dùng chung cho findMany + count để 2 câu query luôn lọc đúng cùng 1 tập bản ghi
// (tổng số phải khớp với số item trả về, không lệch do 2 nơi build where khác nhau).
// contains trên MySQL đã case-insensitive sẵn nhờ collation utf8mb4_unicode_ci (bước 2),
// không cần `mode: "insensitive"` (option đó chỉ áp dụng cho Postgres).
const buildWhere = (category?: string, search?: string): Prisma.ProductWhereInput | undefined => {
  const conditions: Prisma.ProductWhereInput[] = [];

  if (category) conditions.push({ category });
  if (search) {
    conditions.push({
      OR: [{ name: { contains: search } }, { description: { contains: search } }],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : undefined;
};

const ORDER_BY: Record<ProductSortBy, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  reviewCount: { reviewCount: "desc" },
  rating: { avgRating: "desc" },
};

const findMany = (
  { category, search, sortBy = "newest", skip, take }: FindManyParams,
  db: DbClient = prisma
): Promise<Product[]> => {
  return db.product.findMany({
    where: buildWhere(category, search),
    orderBy: ORDER_BY[sortBy],
    skip,
    take,
  });
};

const count = (category: string | undefined, search: string | undefined, db: DbClient = prisma): Promise<number> => {
  return db.product.count({ where: buildWhere(category, search) });
};

const findBySlug = (slug: string, db: DbClient = prisma): Promise<Product | null> => {
  return db.product.findUnique({ where: { slug } });
};

const findById = (id: string, db: DbClient = prisma): Promise<Product | null> => {
  return db.product.findUnique({ where: { id } });
};

const updateAggregates = (
  id: string,
  data: { avgRating: number; reviewCount: number },
  db: DbClient = prisma
): Promise<Product> => {
  return db.product.update({ where: { id }, data });
};

// Trừ kho có điều kiện — guard `stock >= quantity` nằm NGAY trong WHERE của update,
// nên MySQL thực hiện check-and-set nguyên tử trong 1 câu lệnh (không cần SELECT...FOR
// UPDATE hay raw SQL). Trả về số dòng bị ảnh hưởng: 0 nghĩa là không đủ hàng — orderService
// diễn giải giá trị này thành lỗi, repository không throw ApiError.
const decrementStock = (productId: string, quantity: number, db: DbClient = prisma): Promise<number> => {
  return db.product
    .updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    })
    .then((result) => result.count);
};

export const productRepository = {
  findMany,
  count,
  findBySlug,
  findById,
  updateAggregates,
  decrementStock,
};
