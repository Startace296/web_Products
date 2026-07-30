// Tầng: repository — nơi DUY NHẤT chạm Prisma cho CartItem.
import { prisma } from "../config/prisma";
import type { CartItem, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

const cartItemSelect = {
  id: true,
  productId: true,
  quantity: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: { id: true, name: true, slug: true, imageUrl: true, category: true, price: true, stock: true },
  },
} satisfies Prisma.CartItemSelect;

export type CartItemWithProduct = Prisma.CartItemGetPayload<{ select: typeof cartItemSelect }>;

const findManyByUser = (userId: string, db: DbClient = prisma): Promise<CartItemWithProduct[]> => {
  return db.cartItem.findMany({
    where: { userId },
    select: cartItemSelect,
    orderBy: { createdAt: "asc" },
  });
};

const findByUserAndProduct = (userId: string, productId: string, db: DbClient = prisma): Promise<CartItem | null> => {
  return db.cartItem.findUnique({ where: { userId_productId: { userId, productId } } });
};

// Atomic: 2 request "thêm vào giỏ" cùng sản phẩm chạy song song không mất update
// nhờ increment thực hiện ở tầng DB (1 câu SQL), không phải read-modify-write ở app.
const upsertItem = (userId: string, productId: string, quantity: number, db: DbClient = prisma): Promise<CartItem> => {
  return db.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: { increment: quantity } },
    create: { userId, productId, quantity },
  });
};

const setQuantity = (userId: string, productId: string, quantity: number, db: DbClient = prisma): Promise<CartItem> => {
  return db.cartItem.update({ where: { userId_productId: { userId, productId } }, data: { quantity } });
};

const removeItem = (userId: string, productId: string, db: DbClient = prisma): Promise<CartItem> => {
  return db.cartItem.delete({ where: { userId_productId: { userId, productId } } });
};

const clearByUser = (userId: string, db: DbClient = prisma): Promise<Prisma.BatchPayload> => {
  return db.cartItem.deleteMany({ where: { userId } });
};

export const cartRepository = {
  findManyByUser,
  findByUserAndProduct,
  upsertItem,
  setQuantity,
  removeItem,
  clearByUser,
};
