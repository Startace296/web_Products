// Tầng: middleware — xác thực access token, gắn req.user cho route phía sau.
import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

export const verifyToken = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(ApiError.unauthorized("Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    // TokenExpiredError / JsonWebTokenError normalized centrally in errorHandler.
    next(err);
  }
};
