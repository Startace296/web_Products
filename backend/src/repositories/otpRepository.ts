// Layer: repository — the only place that touches Prisma for OtpCode.
import { prisma } from "../config/prisma";
import type { OtpCode, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CreateOtpCodeInput {
  userId: string;
  codeHash: string;
  expiresAt: Date;
}

const create = (input: CreateOtpCodeInput, db: DbClient = prisma): Promise<OtpCode> => {
  return db.otpCode.create({ data: input });
};

// "Mã đang hiệu lực" của 1 user = row consumedAt=null mới nhất — không cần bước
// invalidate rõ ràng mỗi lần tạo mã mới, các row cũ hơn đơn giản không còn được nhìn tới.
const findLatestActiveForUser = (userId: string, db: DbClient = prisma): Promise<OtpCode | null> => {
  return db.otpCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
};

const markConsumed = (id: string, db: DbClient = prisma): Promise<OtpCode> => {
  return db.otpCode.update({ where: { id }, data: { consumedAt: new Date() } });
};

const incrementAttempts = (id: string, db: DbClient = prisma): Promise<OtpCode> => {
  return db.otpCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
};

export const otpRepository = {
  create,
  findLatestActiveForUser,
  markConsumed,
  incrementAttempts,
};
