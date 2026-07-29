// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Product.
import { prisma } from "../config/prisma";
import type { Prisma, Product } from "@prisma/client";

// Chấp nhận cả PrismaClient singleton lẫn transaction client (tx), để service có
// thể gộp cập nhật Product vào cùng transaction với Review (xem reviewService).
type DbClient = Prisma.TransactionClient | typeof prisma;

interface FindManyParams {
  category?: string;
  search?: string;
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

const findMany = ({ category, search, skip, take }: FindManyParams, db: DbClient = prisma): Promise<Product[]> => {
  return db.product.findMany({
    where: buildWhere(category, search),
    orderBy: { createdAt: "desc" },
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

export const productRepository = {
  findMany,
  count,
  findBySlug,
  findById,
  updateAggregates,
};
