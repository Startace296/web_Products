// Tầng: utils — wrapper mỏng quanh Cloudinary SDK, tương tự utils/jwt.ts wrap jsonwebtoken.
import { Readable } from "stream";
import { cloudinary } from "../config/cloudinary";

export interface UploadedImage {
  url: string;
  publicId: string;
}

// multer dùng memoryStorage nên file nằm sẵn trong RAM dưới dạng Buffer — chuyển
// thành stream để dùng upload_stream (không cần ghi file tạm ra đĩa).
export const uploadImageBuffer = (buffer: Buffer, folder: string): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error || !result) {
        // Cloudinary's error param được TS gõ như 1 error object có `.message`, nhưng ở
        // runtime nó KHÔNG phải instanceof Error thật (là object thường) — nếu reject
        // thẳng object đó, errorHandler.ts sẽ không nhận diện được (rơi vào nhánh
        // "Something went wrong" chung chung, mất luôn message thật kể cả ở dev). Luôn
        // bọc lại thành Error thật để giữ message phục vụ debug.
        const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Cloudinary upload failed";
        reject(new Error(message));
        return;
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });

    Readable.from(buffer).pipe(uploadStream);
  });
};
