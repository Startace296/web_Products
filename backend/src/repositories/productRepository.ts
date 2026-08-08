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

// Hoàn kho khi admin huỷ 1 đơn đã CONFIRMED (đã trừ kho thật trước đó — xem
// orderService.updateStatus). Không cần guard trong WHERE như decrementStock vì cộng
// kho luôn hợp lệ, không có điều kiện "đủ hàng" nào cần kiểm tra.
const incrementStock = (productId: string, quantity: number, db: DbClient = prisma): Promise<number> => {
  return db.product
    .updateMany({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    })
    .then((result) => result.count);
};

export interface ProductSpecificationInput {
  label: string;
  value: string;
}

interface CreateProductInput {
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  brand?: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  specifications?: ProductSpecificationInput[];
}

interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  price?: number;
  originalPrice?: number | null;
  stock?: number;
  specifications?: ProductSpecificationInput[];
}

// Prisma's Json input type wants an index-signature object/array (Prisma.InputJsonValue),
// which ProductSpecificationInput[] (concrete keys, no index signature) doesn't
// structurally satisfy even though every value is plain JSON — cast at the one place
// that touches Prisma, not on the domain-facing interfaces above.
const create = (input: CreateProductInput, db: DbClient = prisma): Promise<Product> => {
  return db.product.create({ data: input as Prisma.ProductCreateInput });
};

const update = (id: string, input: UpdateProductInput, db: DbClient = prisma): Promise<Product> => {
  return db.product.update({ where: { id }, data: input as Prisma.ProductUpdateInput });
};

const remove = (id: string, db: DbClient = prisma): Promise<Product> => {
  return db.product.delete({ where: { id } });
};

export const productRepository = {
  findMany,
  count,
  findBySlug,
  findById,
  updateAggregates,
  decrementStock,
  incrementStock,
  create,
  update,
  remove,
};
