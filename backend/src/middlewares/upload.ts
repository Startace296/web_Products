// Tầng: middleware — parse multipart/form-data (file upload) bằng multer.
// memoryStorage: file nằm trong RAM (req.file.buffer), không ghi ra đĩa — phù hợp vì
// utils/cloudinary.ts upload thẳng buffer lên Cloudinary, không cần giữ file trên server.
// Đánh đổi: file lớn chiếm RAM khi đang xử lý request, nên giới hạn kích thước chặt
// (5MB) để 1 request không làm cạn bộ nhớ server.
import multer from "multer";
import { ApiError } from "../utils/ApiError";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // Truyền ApiError thẳng vào callback — multer forward qua next(err), rơi đúng
      // vào errorHandler chung, không cần code xử lý lỗi riêng ở đây.
      cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`));
      return;
    }
    cb(null, true);
  },
}).single("avatar");
