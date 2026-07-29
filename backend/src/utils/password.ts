// Tầng: utils — thuần hàm, không import Express/Prisma.
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export const hashPassword = (plain: string): Promise<string> => {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
};

export const comparePassword = (plain: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(plain, hash);
};
