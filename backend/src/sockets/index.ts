import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env";
import { socketAuth } from "./socketAuth";
import { registerCommentHandlers } from "./commentSocket";
import { userRoom } from "./notificationSocket";
import type { AppServer } from "./types";

export let io: AppServer;

export const initSocket = (httpServer: HttpServer): AppServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Verify JWT lúc handshake cho MỌI kết nối, trước khi vào "connection" — gắn
  // socket.data.user nếu token hợp lệ (xem socketAuth.ts).
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}${socket.data.user ? ` (user ${socket.data.user.id})` : " (anonymous)"}`);

    // Tự join room riêng theo user id nếu đã đăng nhập — không cần client tự emit gì cả,
    // để notificationService phát đúng tới user này bất kể họ đang ở trang nào.
    if (socket.data.user) {
      void socket.join(userRoom(socket.data.user.id));
    }

    registerCommentHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
};
