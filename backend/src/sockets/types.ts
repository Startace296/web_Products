// Kiểu dữ liệu gắn vào mỗi socket (socket.data) — dùng chung cho socketAuth.ts,
// commentSocket.ts và sockets/index.ts để socket.data.user có type thật, không phải `any`.
import type { DefaultEventsMap, Server, Socket } from "socket.io";
import type { AuthenticatedUser } from "../types/express";

export interface SocketData {
  user?: AuthenticatedUser;
}

// Chưa gõ type chi tiết cho từng event (ListenEvents/EmitEvents) — số lượng sự kiện
// realtime còn ít, giữ DefaultEventsMap (cho phép mọi tên event) để tránh boilerplate
// khai báo interface cho từng payload ở bước này; SocketData mới là phần bắt buộc gõ
// đúng vì nó quyết định danh tính user có được tin cậy hay không.
export type AppServer = Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
export type AppSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
