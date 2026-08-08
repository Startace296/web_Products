// Tầng: provider — bọc React Query, đứng sâu nhất có thể trong cây (chỉ quanh {children}).
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  });

// Singleton CHỈ ở browser — trên server phải luôn tạo mới (mỗi request 1 instance
// riêng), nếu không data của request này sẽ rò sang request khác cùng process. Ở
// browser thì ngược lại: phải là đúng 1 instance suốt vòng đời tab, để authStore
// (setAuth/clearAuth) và lib/axios.ts (buộc đăng xuất khi refresh thất bại) — cả 2
// đều là module thường, không thể dùng useQueryClient() — có thể lấy ra CÙNG 1
// QueryClient mà QueryProvider bên dưới đang render, để xoá cache khi đổi danh tính
// (xem authStore.setAuth/clearAuth: nếu không xoá, cache giỏ hàng/đơn hàng của user
// cũ vẫn còn "fresh" trong bộ nhớ và hiện nhầm sang user vừa đăng nhập trong CÙNG tab).
let browserQueryClient: QueryClient | undefined;

export const getQueryClient = (): QueryClient => {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Lazy init qua useState: gọi getQueryClient() thay vì "new QueryClient()" trực
  // tiếp để component này và các module ngoài React (authStore, lib/axios.ts) luôn
  // trỏ về cùng 1 instance ở browser.
  const [queryClient] = useState(() => getQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
