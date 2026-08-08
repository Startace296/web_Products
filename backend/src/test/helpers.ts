// Tầng: test helper — dựng app Express thật (không mock Express/routing/middleware) và
// factory tạo User thẳng qua Prisma, bỏ qua HTTP layer cho phần setup không phải trọng
// tâm của test (vd: test luồng order không cần đăng ký/verify OTP thật để có 1 user).
import type { Role, User } from "@prisma/client";
import { createApp } from "../app";
import { prisma } from "../config/prisma";
import { hashPassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";

export const app = createApp();

let userCounter = 0;

interface CreateTestUserOptions {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
  isVerified?: boolean;
}

export const DEFAULT_TEST_PASSWORD = "Password123";

export const createTestUser = async (opts: CreateTestUserOptions = {}): Promise<User> => {
  userCounter += 1;
  const passwordHash = await hashPassword(opts.password ?? DEFAULT_TEST_PASSWORD);

  return prisma.user.create({
    data: {
      email: opts.email ?? `user${userCounter}-${Date.now()}@test.local`,
      passwordHash,
      name: opts.name ?? "Test User",
      role: opts.role ?? "USER",
      isVerified: opts.isVerified ?? true,
    },
  });
};

export const createTestAdmin = (opts: CreateTestUserOptions = {}): Promise<User> =>
  createTestUser({ ...opts, role: "ADMIN" });

// Ký thẳng access token bằng utils/jwt thật thay vì đi qua /auth/login — cùng lý do
// createTestUser bỏ qua HTTP: test cho route order/product... không có trách nhiệm phải
// re-verify luồng login, authService.test.ts (nếu có) mới là nơi test việc đó.
export const authHeaderFor = (user: User): [string, string] => [
  "Authorization",
  `Bearer ${signAccessToken({ id: user.id, email: user.email, role: user.role })}`,
];
