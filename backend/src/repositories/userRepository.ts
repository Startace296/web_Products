// Tầng: repository — nơi DUY NHẤT được import prisma và chạm DB cho User.
import { prisma } from "../config/prisma";
import type { User } from "@prisma/client";

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

const create = (input: CreateUserInput): Promise<User> => {
  return prisma.user.create({ data: input });
};

const updateAvatar = (id: string, avatarUrl: string): Promise<User> => {
  return prisma.user.update({ where: { id }, data: { avatarUrl } });
};

export const userRepository = {
  findByEmail,
  findById,
  create,
  updateAvatar,
};
