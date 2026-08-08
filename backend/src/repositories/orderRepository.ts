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

// Chỉ dùng cho admin: danh sách đơn của TẤT CẢ user cần biết đơn của ai — orderSelect
// dùng cho luồng khách hàng không cần field này vì đã biết chắc đó là đơn của chính mình.
const orderAdminSelect = {
  ...orderSelect,
  user: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderSelect;

export type OrderWithItemsAndUser = Prisma.OrderGetPayload<{ select: typeof orderAdminSelect }>;

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

interface FindManyAdminParams {
  status?: OrderStatus;
  skip: number;
  take: number;
}

const findManyAdmin = (
  { status, skip, take }: FindManyAdminParams,
  db: DbClient = prisma
): Promise<OrderWithItemsAndUser[]> => {
  return db.order.findMany({
    where: status ? { status } : undefined,
    select: orderAdminSelect,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
};

const countAdmin = (status: OrderStatus | undefined, db: DbClient = prisma): Promise<number> => {
  return db.order.count({ where: status ? { status } : undefined });
};

// Update có điều kiện — WHERE khớp cả id LẪN status hiện tại, cùng kiểu "check-and-set
// nguyên tử" như decrementStock. Chặn race: 2 admin bấm cùng lúc, hoặc admin cập nhật
// đúng lúc IPN VNPay cũng đang xử lý cùng đơn. Trả về số dòng bị ảnh hưởng: 0 nghĩa là
// đơn đã đổi status ở nơi khác giữa lúc đọc và lúc ghi — orderService diễn giải thành lỗi.
const updateStatus = (
  id: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  db: DbClient = prisma
): Promise<number> => {
  return db.order
    .updateMany({ where: { id, status: fromStatus }, data: { status: toStatus } })
    .then((result) => result.count);
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
  findManyAdmin,
  countAdmin,
  updateStatus,
};
