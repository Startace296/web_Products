import { createServer } from "http";
import { createApp } from "./app";
import { initSocket } from "./sockets";
import { env } from "./config/env";
import { disconnectPrisma } from "./config/prisma";

const app = createApp();
const httpServer = createServer(app);

initSocket(httpServer);

const server = httpServer.listen(env.PORT, () => {
  console.log(`[server] TechPulse API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (signal: string): void => {
  console.log(`[server] received ${signal}, shutting down gracefully...`);

  server.close(() => {
    void disconnectPrisma().finally(() => {
      console.log("[server] shutdown complete");
      process.exit(0);
    });
  });

  // Fallback in case connections never drain (e.g. open sockets).
  setTimeout(() => {
    console.error("[server] forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled rejection:", reason);
});
