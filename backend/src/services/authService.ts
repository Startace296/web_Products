// Tầng: service — business logic thuần, không import Express (req/res).
// Đây là nơi DUY NHẤT được throw ApiError trong luồng auth.
import type { User } from "@prisma/client";
import { userRepository } from "../repositories/userRepository";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import { toSafeUser, SafeUser } from "../utils/sanitizeUser";
import type { RegisterInput, LoginInput } from "../validations/authValidation";

interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

const toJwtPayload = (user: User): JwtPayload => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

const register = async (input: RegisterInput): Promise<AuthResult> => {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) {
    throw ApiError.conflict("Email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  const payload = toJwtPayload(user);
  return {
    user: toSafeUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await userRepository.findByEmail(input.email);

  // Same error for "no such user" and "wrong password" — don't leak which one it was
  // (user enumeration on the login endpoint is the one we actually guard against).
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const payload = toJwtPayload(user);
  return {
    user: toSafeUser(user),
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

const refresh = async (refreshToken: string | undefined): Promise<{ accessToken: string }> => {
  if (!refreshToken) {
    throw ApiError.unauthorized("Missing refresh token");
  }

  // Throws (TokenExpiredError/JsonWebTokenError) if invalid — normalized centrally in errorHandler.
  const payload = verifyRefreshToken(refreshToken);

  // Re-fetch instead of trusting the old payload, so a deleted account or role
  // change is reflected immediately instead of waiting for the token to expire.
  const user = await userRepository.findById(payload.id);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  return { accessToken: signAccessToken(toJwtPayload(user)) };
};

const logout = async (refreshToken: string | undefined): Promise<void> => {
  // Stateless JWT: there is no refresh-token table yet, so nothing can be revoked
  // server-side — logout is really "the client forgets the cookie" (done in the
  // controller). This seam exists so a future token-blacklist/rotation store only
  // has to change this function, not every caller.
  if (!refreshToken) return;
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    // Already invalid/expired — nothing to do.
  }
};

const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }
  return toSafeUser(user);
};

export const authService = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
};
