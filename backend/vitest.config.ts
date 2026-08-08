// require/module.exports (không import/export) — giữ đúng CommonJS như phần còn lại của
// backend (package.json không có "type":"module", tsconfig.json module: "CommonJS"). Dùng
// cú pháp ESM ở đây khiến Vite cảnh báo "ESM syntax in a file loaded as CommonJS" và sẽ
// hết được hỗ trợ ngầm định ở major version sau của Vite.
const path = require("node:path");
const dotenv = require("dotenv");
const { defineConfig } = require("vitest/config");

// Chỉ inject đúng các biến trong .env.test (không phải toàn bộ process.env của máy host)
// vào từng test worker qua `test.env` — theo doc Vitest, .env.test không tự thấy được ở
// globalSetup.ts (chạy ở process khác), nên globalSetup tự load lại file này riêng.
const { parsed } = dotenv.config({ path: path.resolve(__dirname, ".env.test") });

module.exports = defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/globalSetup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    env: parsed,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    // Test dùng 1 MySQL thật dùng chung (không mock) và setup.ts xoá sạch mọi bảng trước
    // mỗi test — chạy nhiều file song song sẽ đụng nhau (file A reset ngay lúc file B đang
    // đọc). Đánh đổi lấy sự đơn giản: chạy tuần tự, không cần DB riêng/schema riêng cho
    // mỗi worker.
    fileParallelism: false,
  },
});
