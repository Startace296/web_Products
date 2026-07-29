// Tầng: lib — helper nhỏ dùng chung để đọc message lỗi từ response backend
// (shape cố định: { success: false, message, details? } — xem backend errorHandler.ts).
import { AxiosError } from "axios";

interface ApiErrorBody {
  message?: string;
}

export function getErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra, vui lòng thử lại."): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
  }
  return fallback;
}
