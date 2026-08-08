// Tầng: test helper — cô lập dữ liệu giữa các test bằng cách xoá sạch mọi bảng trước
// mỗi test (xem setup.ts). Đọc danh sách bảng từ information_schema thay vì liệt kê tay
// theo @@map trong schema.prisma — thêm model mới không cần sửa file này.
//
// Dùng DELETE (không phải TRUNCATE) bên trong 1 interactive transaction: TRUNCATE là DDL,
// MySQL tự COMMIT ngầm khi gặp DDL — làm hỏng transaction đang mở của Prisma. DELETE là
// DML nên an toàn. Transaction cũng đảm bảo toàn bộ câu lệnh chạy trên CÙNG 1 connection,
// nếu không SET FOREIGN_KEY_CHECKS=0 có thể set trên 1 connection trong pool còn các lệnh
// DELETE sau lại rơi vào connection khác (giá trị đã set không còn hiệu lực).
import { prisma } from "../config/prisma";

let cachedTables: string[] | null = null;

const getTableNames = async (): Promise<string[]> => {
  if (cachedTables) return cachedTables;

  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.tables
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME != '_prisma_migrations'`
  );
  cachedTables = rows.map((r) => r.TABLE_NAME);
  return cachedTables;
};

export const resetDb = async (): Promise<void> => {
  const tables = await getTableNames();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of tables) {
      await tx.$executeRawUnsafe(`DELETE FROM \`${table}\``);
    }
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
};
