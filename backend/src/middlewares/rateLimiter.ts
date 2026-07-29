// Tầng: middleware — chặn brute-force / spam trên các route ghi dữ liệu nhạy cảm.
import rateLimit from "express-rate-limit";
import { ApiError } from "../utils/ApiError";

const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // trả RateLimit-* header để client biết còn bao nhiêu lượt
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests(message));
    },
  });

// Giới hạn theo IP. Đủ cho MVP; nếu deploy sau proxy/load balancer phải
// set app.set("trust proxy", ...) trong app.ts, nếu không req.ip sẽ luôn là
// IP của proxy và rate limit áp dụng sai (dồn tất cả user vào chung 1 IP).
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  10,
  "Too many login attempts. Please try again in 15 minutes."
);

export const registerLimiter = createRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many accounts created from this IP. Please try again later."
);

// Review/comment creation không có limiter nào từ bước 4/8 tới giờ — audit ở bước 10
// phát hiện khoảng trống này, thêm để chặn bot spam nội dung.
export const writeActionLimiter = createRateLimiter(
  15 * 60 * 1000,
  30,
  "Too many actions. Please slow down and try again later."
);

// Upload tốn chi phí Cloudinary + băng thông hơn hẳn 1 request thường — giới hạn chặt hơn.
export const uploadLimiter = createRateLimiter(
  60 * 60 * 1000,
  10,
  "Too many uploads. Please try again later."
);
