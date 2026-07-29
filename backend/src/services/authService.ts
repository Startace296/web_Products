// Layer: service — pure business logic, no Express import (req/res).
// This is the ONLY place allowed to throw ApiError in the auth flow.
import ms from "ms";
import type { Prisma, User } from "@prisma/client";
import { env } from "../config/env";
import { runInTransaction } from "../config/prisma";
import { userRepository } from "../repositories/userRepository";
import { refreshTokenRepository } from "../repositories/refreshTokenRepository";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from "../utils/jwt";
import { hashToken } from "../utils/tokenHash";
import { ApiError } from "../utils/ApiError";
import { toSafeUser, SafeUser } from "../utils/sanitizeUser";
import type { RegisterInput, LoginInput } from "../validations/authValidation";

interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

const toJwtPayload = (user: User): JwtPayload => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

const refreshExpiryDate = (): Date => new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN as ms.StringValue));

// Signs a new refresh token AND persists its hash so it can be revoked/rotated later —
// every place that hands out a refresh token (register, login, refresh-rotation) must
// go through this so none of them can accidentally issue a token the DB doesn't know about.
const issueRefreshToken = async (user: User, tx?: Prisma.TransactionClient): Promise<string> => {
  const token = signRefreshToken(toJwtPayload(user));
  await refreshTokenRepository.create(
    { userId: user.id, tokenHash: hashToken(token), expiresAt: refreshExpiryDate() },
    tx
  );
  return token;
};

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

  return {
    user: toSafeUser(user),
    accessToken: signAccessToken(toJwtPayload(user)),
    refreshToken: await issueRefreshToken(user),
  };
};

const login = async (input: LoginInput): Promise<AuthResult> => {
  const user = await userRepository.findByEmail(input.email);

  // Same error for "no such user" and "wrong password" — don't leak which one it was
  // (user enumeration on the login endpoint is the one we actually guard against).
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  return {
    user: toSafeUser(user),
    accessToken: signAccessToken(toJwtPayload(user)),
    refreshToken: await issueRefreshToken(user),
  };
};

const refresh = async (refreshToken: string | undefined): Promise<RefreshResult> => {
  if (!refreshToken) {
    throw ApiError.unauthorized("Missing refresh token");
  }

  // Throws (TokenExpiredError/JsonWebTokenError) if the JWT itself is malformed/expired —
  // normalized centrally in errorHandler.
  const payload = verifyRefreshToken(refreshToken);

  const stored = await refreshTokenRepository.findByHash(hashToken(refreshToken));
  if (!stored) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  if (stored.revokedAt) {
    // Reuse of an already-rotated-out token: the legitimate client already moved past
    // this exact token, so whoever just presented it again is not the current
    // legitimate holder — most likely a stolen token being replayed. Kill every
    // session for this user so both the thief and the real user are logged out
    // everywhere; forcing a fresh login is the safe default when theft is suspected.
    await refreshTokenRepository.revokeAllForUser(stored.userId);
    throw ApiError.unauthorized("Refresh token reuse detected — all sessions revoked");
  }

  if (stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token expired");
  }

  // Re-fetch instead of trusting the old payload, so a deleted account or role
  // change is reflected immediately instead of waiting for the token to expire.
  const user = await userRepository.findById(payload.id);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  // Rotation: revoke the token just used and issue a brand new one in the same
  // transaction. If this exact (now revoked) token is ever presented again, the
  // `stored.revokedAt` check above will catch it as reuse.
  const newRefreshToken = await runInTransaction(async (tx) => {
    await refreshTokenRepository.revoke(stored.id, tx);
    return issueRefreshToken(user, tx);
  });

  return {
    accessToken: signAccessToken(toJwtPayload(user)),
    refreshToken: newRefreshToken,
  };
};

const logout = async (refreshToken: string | undefined): Promise<void> => {
  if (!refreshToken) return;

  // Revoke by hash lookup only — deliberately does NOT require the JWT signature/exp
  // to still be valid, so a client logging out with an already-expired cookie still
  // succeeds in wiping whatever DB record exists for it. Logout must never fail from
  // the client's perspective.
  const stored = await refreshTokenRepository.findByHash(hashToken(refreshToken));
  if (stored && !stored.revokedAt) {
    await refreshTokenRepository.revoke(stored.id);
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
