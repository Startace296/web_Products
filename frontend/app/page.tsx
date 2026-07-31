import { Suspense } from "react";
import { HomePage } from "@/components/product/HomePage";

export default function Home() {
  // HomePage đọc useSearchParams (?category=... từ ProductBreadcrumb) — Next.js yêu cầu
  // bọc Suspense quanh Client Component gọi hook này, nếu không "next build" sẽ lỗi
  // "Missing Suspense boundary with useSearchParams" khi route được prerender tĩnh.
  return (
    <div className="flex flex-1 justify-center">
      <Suspense>
        <HomePage />
      </Suspense>
    </div>
  );
}
