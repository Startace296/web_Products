// Tầng: provider — 1 kết nối Socket.IO dùng chung toàn app. Hook truy cập nằm ở
// hooks/useSocket.ts (tách riêng: provider tạo/nắm giữ kết nối, hook chỉ đọc).
"use client";

import { createContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

// Lưu ý: đây là URL gốc của server (Socket.IO gắn vào cùng httpServer với Express,
// KHÔNG có prefix /api/v1), khác với NEXT_PUBLIC_API_URL dùng cho REST.
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

export const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  // Chỉ cần theo dõi user.id (không phải cả object user) để tránh effect chạy lại
  // vì lý do không liên quan (vd: cập nhật bio) — chỉ login/logout mới đổi id.
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    const instance = io(socketUrl, {
      withCredentials: true,
      // Đọc token mới nhất tại thời điểm (re)connect thay vì đóng băng giá trị cũ
      // trong closure — cùng với dependency [userId] bên dưới, đảm bảo socket luôn
      // được TẠO LẠI (nên handshake mới) mỗi khi đăng nhập/đăng xuất, thay vì giữ
      // nguyên 1 kết nối "ẩn danh" xuyên suốt dù user đã login sau đó.
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    });

    // Cố ý setState đồng bộ trong effect (khác khuyến nghị mặc định của
    // react-hooks/set-state-in-effect): việc tạo socket BẮT BUỘC phải nằm trong effect
    // (không phải render body hay useState initializer) vì effect chỉ chạy ở client —
    // nếu tạo trong render body, component "use client" này vẫn bị Next.js render lần
    // đầu trên server, và sẽ mở 1 kết nối socket thật từ tiến trình server, không phải
    // browser. Đây là ngoại lệ có chủ đích, không phải bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [userId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
