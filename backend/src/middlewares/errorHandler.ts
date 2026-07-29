import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { MulterError } from "multer";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Must be registered last, after all routes, with 4 args so Express recognizes it as an error handler.
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const apiError = normalizeError(err);
  const isProd = env.NODE_ENV === "production";

  if (!apiError.isOperational) {
    console.error(`[UNHANDLED ERROR] ${req.method} ${req.originalUrl}`, err);
  }

  // Never leak internal error messages or stack traces to the client in production.
  const message = !apiError.isOperational && isProd ? "Internal server error" : apiError.message;

  res.status(apiError.statusCode).json({
    success: false,
    message,
    details: apiError.isOperational ? apiError.details : undefined,
    ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
};

function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return ApiError.unprocessable("Validation failed", err.flatten().fieldErrors);
  }

  if (isPrismaKnownRequestError(err)) {
    if (err.code === "P2002") {
      return ApiError.conflict("Resource already exists", { fields: err.meta?.target });
    }
    if (err.code === "P2025") {
      return ApiError.notFound("Resource not found");
    }
    return ApiError.badRequest("Database request error", { code: err.code });
  }

  if (err instanceof TokenExpiredError) {
    return ApiError.unauthorized("Token expired");
  }

  if (err instanceof JsonWebTokenError) {
    return ApiError.unauthorized("Invalid token");
  }

  // multer báo file quá lớn / sai field / sai số lượng file bằng MulterError riêng,
  // không đi qua middlewares/validate.ts (Zod) vì đây là lỗi ở tầng parse multipart,
  // trước khi req.body/req.file kịp tồn tại.
  if (err instanceof MulterError) {
    return normalizeMulterError(err);
  }

  // Lưới an toàn chung cho lỗi từ middleware "ngoan" khác ngoài các case đã liệt kê ở
  // trên (vd: express.json() ném SyntaxError kèm .status/.statusCode = 400 khi client
  // gửi JSON sai cú pháp) — tôn trọng status 4xx đã có sẵn thay vì rơi xuống nhánh
  // 500 bên dưới, để lỗi DO CLIENT gửi sai vẫn được báo đúng là lỗi client (400), không
  // bị hiểu nhầm thành lỗi server.
  if (hasHttpStatus(err)) {
    const status = err.statusCode ?? err.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      return new ApiError(status, err instanceof Error ? err.message : "Bad request");
    }
  }

  if (err instanceof Error) {
    return ApiError.internal(err.message);
  }

  return ApiError.internal("Something went wrong");
}

function normalizeMulterError(err: MulterError): ApiError {
  if (err.code === "LIMIT_FILE_SIZE") {
    return ApiError.badRequest("File too large");
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return ApiError.badRequest("Unexpected file field");
  }
  return ApiError.badRequest(err.message);
}

function hasHttpStatus(err: unknown): err is { status?: unknown; statusCode?: unknown } {
  return typeof err === "object" && err !== null && ("status" in err || "statusCode" in err);
}

// Duck-typed instead of `instanceof Prisma.PrismaClientKnownRequestError` so this file
// doesn't depend on the generated Prisma client having any models yet.
function isPrismaKnownRequestError(
  err: unknown
): err is { code: string; meta?: { target?: unknown } } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "clientVersion" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}
