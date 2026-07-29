import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "./env";

declare global {
  var __prisma__: PrismaClient | undefined;
}

// Reuse the client across hot reloads in dev so we don't exhaust MySQL connections.
export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}

// Services orchestrating a transaction across multiple repositories (e.g. reviewService
// updating both Review and Product) need a `tx` handle, but must not otherwise touch
// Prisma directly ("only repositories touch Prisma"). Exposing this thin wrapper instead
// of the raw `prisma` client keeps that boundary: services can start a transaction and
// hand `tx` to repository functions, but cannot run ad-hoc queries themselves.
export const runInTransaction = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
  return prisma.$transaction(fn);
};

// Used by server.ts during graceful shutdown — lifecycle/composition-root code, not a
// service, but still shouldn't import the raw client just to call one method on it.
export const disconnectPrisma = (): Promise<void> => prisma.$disconnect();
