import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config/env";
import { router } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

export const createApp = (): Application => {
  const app = express();

  // Railway (và hầu hết PaaS) đặt app sau 1 reverse proxy — không set trust proxy thì
  // req.ip luôn là IP của proxy, làm rateLimiter.ts (dựa vào req.ip) dồn tất cả user
  // vào chung 1 "IP", vô hiệu hoá rate limit thật. Chỉ tin 1 hop đầu tiên (giá trị 1),
  // không tin toàn bộ chuỗi X-Forwarded-For — tin toàn bộ sẽ cho phép giả IP để né
  // rate limit. Không bật khi dev vì không có proxy nào ở giữa localhost.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());

  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  app.use("/api/v1", router);

  // Keep these two last: unmatched routes fall through to 404, everything else to errorHandler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
