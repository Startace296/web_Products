// Tầng: lib — axios instance DUY NHẤT của app. Chỉ services/ được import file này,
// component không bao giờ gọi axios trực tiếp.
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true, // bắt buộc để gửi kèm cookie refreshToken (httpOnly) — FE/BE khác origin.
});

// Instance riêng, KHÔNG đi qua interceptor ở dưới — nếu dùng chung `api` để gọi
// /auth/refresh, một refresh thất bại (401) sẽ tự kích hoạt lại chính interceptor
// đang xử lý nó => vòng lặp vô hạn.
const refreshClient = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Các endpoint auth tự thân: 401 ở đây là kết quả nghiệp vụ bình thường (sai mật khẩu,
// thiếu/hết hạn refresh token...), không phải "access token hết hạn giữa chừng" — không retry.
const NO_RETRY_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

// Gộp nhiều request 401 xảy ra đồng thời vào đúng 1 lần gọi /auth/refresh
// (race condition kinh điển: nhiều request song song cùng bị 401 sẽ không gọi refresh N lần).
let refreshPromise: Promise<string> | null = null;

const requestNewAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<{ success: boolean; data: { accessToken: string } }>("/auth/refresh")
      .then((res) => {
        const { accessToken } = res.data.data;
        useAuthStore.getState().setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;
    const isUnauthorized = error.response?.status === 401;
    const isAuthEndpoint = NO_RETRY_PATHS.some((path) => originalRequest?.url?.includes(path));

    if (!isUnauthorized || !originalRequest || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await requestNewAccessToken();
      originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh cũng thất bại (cookie hết hạn/không hợp lệ) — coi như phiên đã hết, đăng xuất.
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    }
  }
);
