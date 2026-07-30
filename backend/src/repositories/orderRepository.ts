// Tầng: repository — nơi DUY NHẤT chạm Prisma cho Order/OrderItem.
import { prisma } from "../config/prisma";
import type { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

const orderSelect = {
  id: true,
  userId: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  totalAmount: true,
  recipientName: true,
  recipientPhone: true,
  shippingAddress: true,
  note: true,
  vnpTxnRef: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: { id: true, productId: true, productName: true, price: true, quantity: true, imageUrl: true },
  },
} satisfies Prisma.OrderSelect;

export type OrderWithItems = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

interface CreateOrderInput {
  userId: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalAmount: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note?: string;
  items: { productId: string; productName: string; price: number; quantity: number; imageUrl: string | null }[];
}

const create = (input: CreateOrderInput, db: DbClient = prisma): Promise<OrderWithItems> => {
  const { items, ...orderData } = input;
  return db.order.create({
    data: { ...orderData, items: { create: items } },
    select: orderSelect,
  });
};

interface FindManyByUserParams {
  userId: string;
  skip: number;
  take: number;
}

const findManyByUser = (
  { userId, skip, take }: FindManyByUserParams,
  db: DbClient = prisma
): Promise<OrderWithItems[]> => {
  return db.order.findMany({
    where: { userId },
    select: orderSelect,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
};

const countByUser = (userId: string, db: DbClient = prisma): Promise<number> => {
  return db.order.count({ where: { userId } });
};

const findById = (id: string, db: DbClient = prisma): Promise<OrderWithItems | null> => {
  return db.order.findUnique({ where: { id }, select: orderSelect });
};

const findByVnpTxnRef = (vnpTxnRef: string, db: DbClient = prisma): Promise<OrderWithItems | null> => {
  return db.order.findUnique({ where: { vnpTxnRef }, select: orderSelect });
};

// Gán mã tham chiếu VNPay CHO LẦN THỬ HIỆN TẠI — gọi ngay sau create() trong cùng
// transaction vì id (dùng để build vnpTxnRef) chỉ có sau khi insert.
const setVnpTxnRef = (id: string, vnpTxnRef: string, db: DbClient = prisma): Promise<OrderWithItems> => {
  return db.order.update({
    where: { id },
    data: { vnpTxnRef, paymentAttempts: { increment: 1 } },
    select: orderSelect,
  });
};

const markPaid = (id: string, db: DbClient = prisma): Promise<OrderWithItems> => {
  return db.order.update({
    where: { id },
    data: { status: "CONFIRMED", paymentStatus: "PAID", paidAt: new Date() },
    select: orderSelect,
  });
};

const markFailed = (id: string, db: DbClient = prisma): Promise<OrderWithItems> => {
  return db.order.update({
    where: { id },
    data: { status: "CANCELLED", paymentStatus: "FAILED" },
    select: orderSelect,
  });
};

export const orderRepository = {
  create,
  findManyByUser,
  countByUser,
  findById,
  findByVnpTxnRef,
  setVnpTxnRef,
  markPaid,
  markFailed,
};
