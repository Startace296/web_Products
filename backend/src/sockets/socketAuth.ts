// Tầng: socket middleware — verify JWT lúc handshake (io.use()), gắn socket.data.user
// từ payload đã verify. KHÔNG bao giờ tin bất kỳ user_id nào client tự gửi kèm trong
// payload của từng sự kiện — danh tính đáng tin DUY NHẤT là kết quả verify ở đây.
import { verifyAccessToken } from "../utils/jwt";
import type { AppSocket } from "./types";

type NextFn = (err?: Error) => void;

export const socketAuth = (socket: AppSocket, next: NextFn): void => {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    // Không có token vẫn cho kết nối (ẩn danh) — comment realtime cho phép XEM công khai,
    // chỉ chặn cụ thể ở hành động cần đăng nhập (comment:create), không chặn cả handshake.
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.data.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    // Token sai/hết hạn: vẫn kết nối như ẩn danh thay vì reject handshake — access token
    // hết hạn không nên làm rớt cả kết nối realtime, chỉ mất quyền tạo comment cho tới khi
    // client tự reconnect với token mới (SocketProvider ở FE tự làm việc này khi user đổi).
    next();
  }
};
