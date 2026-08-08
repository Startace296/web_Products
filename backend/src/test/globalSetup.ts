// Chạy 1 LẦN trong process riêng trước toàn bộ test suite (Vitest globalSetup), KHÔNG
// chia sẻ module registry với các test file — vì vậy env nạp qua `test.env` trong
// vitest.config.ts không tới được đây, phải tự dotenv.config() lại .env.test.
import path from "node:path";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

export default function setup(): void {
  dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

  // Áp toàn bộ migration đã có sẵn (prisma/migrations) lên DB test — cùng schema với
  // production, khác `db push` (không tạo migration history, dễ lệch schema thật).
  // Yêu cầu container MySQL test đã chạy (npm run test:db:up).
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../.."),
    stdio: "inherit",
    env: process.env,
  });
}
