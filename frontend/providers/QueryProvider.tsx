// Tầng: provider — bọc React Query, đứng sâu nhất có thể trong cây (chỉ quanh {children}).
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Lazy init qua useState: mỗi client (browser tab) có đúng 1 QueryClient,
  // không bị tạo lại mỗi render, và không share instance giữa các request trên server.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
