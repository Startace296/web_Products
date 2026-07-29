// Layer: repository — the only place that touches Prisma for RefreshToken.
import { prisma } from "../config/prisma";
import type { Prisma, RefreshToken } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

const create = (input: CreateRefreshTokenInput, db: DbClient = prisma): Promise<RefreshToken> => {
  return db.refreshToken.create({ data: input });
};

const findByHash = (tokenHash: string, db: DbClient = prisma): Promise<RefreshToken | null> => {
  return db.refreshToken.findUnique({ where: { tokenHash } });
};

const revoke = (id: string, db: DbClient = prisma): Promise<RefreshToken> => {
  return db.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
};

// Used on reuse detection (kill every session for this user) — only targets tokens
// that aren't already revoked, so repeated calls stay cheap no-ops.
const revokeAllForUser = (userId: string, db: DbClient = prisma): Promise<Prisma.BatchPayload> => {
  return db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const refreshTokenRepository = {
  create,
  findByHash,
  revoke,
  revokeAllForUser,
};
