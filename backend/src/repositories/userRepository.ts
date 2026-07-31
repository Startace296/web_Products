// Tầng: repository — nơi DUY NHẤT được import prisma và chạm DB cho User.
import { prisma } from "../config/prisma";
import type { Prisma, User } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

const findByEmail = (email: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { email } });
};

const findById = (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

// db param tuỳ chọn (giống refreshTokenRepository) — otpService cần tạo User cùng
// OtpCode trong 1 transaction (gửi email OTP thành công mới ghi DB, xem authService.register).
const create = (input: CreateUserInput, db: DbClient = prisma): Promise<User> => {
  return db.user.create({ data: input });
};

const updateAvatar = (id: string, avatarUrl: string): Promise<User> => {
  return prisma.user.update({ where: { id }, data: { avatarUrl } });
};

const markVerified = (id: string, db: DbClient = prisma): Promise<User> => {
  return db.user.update({ where: { id }, data: { isVerified: true } });
};

export const userRepository = {
  findByEmail,
  findById,
  create,
  updateAvatar,
  markVerified,
};
