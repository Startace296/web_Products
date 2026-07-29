// Tầng: service — component chỉ được gọi API auth qua đây, không import lib/axios trực tiếp.
import { api } from "@/lib/axios";
import type { AuthUser } from "@/store/authStore";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export const authApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>("/auth/register", payload);
    return data.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
    return data.data;
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await api.get<ApiEnvelope<{ user: AuthUser }>>("/auth/me");
    return data.data.user;
  },

  // KHÔNG export hàm refresh() ở đây — refresh chỉ được kích hoạt tự động bởi
  // interceptor trong lib/axios.ts khi gặp 401, component không tự gọi refresh thủ công.
};
