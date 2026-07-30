// Tầng: middleware — kiểm tra quyền theo role, PHẢI đứng sau verifyToken (cần req.user
// đã được gắn sẵn). Dùng Role từ Prisma làm tham số để gọi sai tên role (typo) là lỗi
// biên dịch, không phải lỗi runtime mới phát hiện lúc chạy.
import { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Chỉ xảy ra nếu middleware bị gắn thiếu verifyToken phía trước — lỗi cấu hình
      // route, không phải lỗi nghiệp vụ của request.
      next(ApiError.unauthorized("Missing authentication"));
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(ApiError.forbidden("You do not have permission to perform this action"));
      return;
    }

    next();
  };
