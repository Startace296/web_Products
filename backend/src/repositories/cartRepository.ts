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

// Atomic: điều kiện "không vượt cap" nằm ngay trong WHERE, cùng 1 câu SQL với việc ghi —
// khác với increment qua upsert() trước đây, nơi cartService phải tự đọc quantity hiện
// tại rồi mới quyết định có được ghi hay không (đọc-rồi-ghi không atomic: 2 request cùng
// đọc quantity cũ trước khi bên nào ghi xong sẽ cùng pass check rồi cùng ghi, cộng dồn
// vượt cap). count === 0 nghĩa là HOẶC chưa có dòng nào (lần đầu thêm — cartService sẽ
// tạo mới), HOẶC dòng đã tồn tại nhưng cộng thêm sẽ vượt cap.
const incrementIfWithinCap = (
  userId: string,
  productId: string,
  quantity: number,
  cap: number,
  db: DbClient = prisma
): Promise<number> => {
  return db.cartItem
    .updateMany({
      where: { userId, productId, quantity: { lte: cap - quantity } },
      data: { quantity: { increment: quantity } },
    })
    .then((result) => result.count);
};

// Tạo dòng đầu tiên cho (userId, productId). quantity ban đầu luôn <= cap (Zod đã chặn ở
// request), nên không cần check cap ở đây — chỉ có thể lỗi P2002 nếu 1 request khác vừa
// tạo dòng này trước (2 lần "thêm lần đầu" cùng sản phẩm chạy song song), cartService xử
// lý bằng cách bắt P2002 rồi thử lại incrementIfWithinCap.
const createItem = (userId: string, productId: string, quantity: number, db: DbClient = prisma): Promise<CartItem> => {
  return db.cartItem.create({ data: { userId, productId, quantity } });
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
  incrementIfWithinCap,
  createItem,
  setQuantity,
  removeItem,
  clearByUser,
};
