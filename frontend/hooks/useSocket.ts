"use client";

import { useContext } from "react";
import type { Socket } from "socket.io-client";
import { SocketContext } from "@/providers/SocketProvider";

// Đọc kết nối Socket.IO do SocketProvider tạo. Trả về null trong khoảnh khắc đầu
// (trước khi effect trong provider chạy) hoặc nếu dùng ngoài <SocketProvider>.
export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
