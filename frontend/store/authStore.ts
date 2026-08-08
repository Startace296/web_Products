// Tầng: store (Zustand) — state auth dùng chung toàn app.
// accessToken CHỈ giữ trong memory (không persist localStorage/sessionStorage):
// nếu XSS xảy ra, token không nằm sẵn trong storage để bị đọc trộm. Refresh token
// thật nằm ở httpOnly cookie phía backend, JS không đụng tới được.
// Hệ quả: reload trang cứng sẽ mất accessToken trong store cho tới khi có request
// nào đó tự refresh lại (xem lib/axios.ts) — ProtectedRoute (bước 6) xử lý việc này
// bằng cách gọi authApi.me() lúc mount thay vì tự bootstrap toàn app.
import { create } from "zustand";
import { getQueryClient } from "@/providers/QueryProvider";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  role: "USER" | "ADMIN";
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  // Dùng khi đã có accessToken hợp lệ (interceptor tự refresh xong) và chỉ cần
  // gắn lại `user` — vd: ProtectedRoute gọi authApi.me() lúc mount.
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

// Xoá React Query cache mỗi khi danh tính đổi (đăng nhập MỚI hoặc đăng xuất) — nếu
// không, cache của user/admin trước (giỏ hàng, đơn hàng...) vẫn "fresh" trong bộ nhớ
// và hiện nhầm sang tài khoản vừa đăng nhập trong CÙNG tab (query key như ["cart"]
// không tự phân biệt theo user). Đặt ở store thay vì rải useQueryClient().clear() ở
// từng nơi gọi setAuth/clearAuth (LoginForm, Navbar, lib/axios.ts khi refresh thất
// bại, ProfileView khi xoá tài khoản...) để không nơi nào có thể quên gọi.
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => {
    getQueryClient().clear();
    set({ accessToken, user });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clearAuth: () => {
    getQueryClient().clear();
    set({ accessToken: null, user: null });
  },
}));
