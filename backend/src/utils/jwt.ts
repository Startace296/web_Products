// Tầng: utils — thuần hàm ký/verify JWT, không import Express.
import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import type { AuthenticatedUser } from "../types/express";

export type JwtPayload = AuthenticatedUser;

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);

// jti ngẫu nhiên: token_hash trong bảng refresh_tokens là UNIQUE, nhưng jsonwebtoken chỉ
// tính `iat` theo GIÂY — 2 lần issue cho cùng 1 user (payload id/email/role giống hệt
// nhau) trong cùng 1 giây (vd: login rồi refresh ngay sau đó) ký ra 2 JWT Y HỆT NHAU,
// khiến refreshTokenRepository.create() lần thứ 2 vỡ unique constraint (409 thay vì
// thành công). jti đảm bảo mỗi refresh token luôn khác nhau bất kể timing.
export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
