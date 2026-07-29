// Tầng: utils — dùng chung bởi authService.ts và userService.ts để không lặp lại
// logic ẩn passwordHash mỗi nơi trả User ra ngoài.
import type { User } from "@prisma/client";

export type SafeUser = Omit<User, "passwordHash">;

export const toSafeUser = (user: User): SafeUser => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};
