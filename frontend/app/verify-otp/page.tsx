import { Suspense } from "react";
import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

export default function VerifyOtpPage() {
  // VerifyOtpForm đọc useSearchParams (?email=... từ RegisterForm/LoginForm) — Next.js
  // yêu cầu bọc Suspense quanh Client Component gọi hook này, nếu không "next build" sẽ
  // lỗi "Missing Suspense boundary with useSearchParams" (xem app/page.tsx cho tiền lệ).
  return (
    <div className="dark relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16 sm:py-24">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex w-full max-w-5xl items-center justify-center gap-16 lg:justify-between">
        <AuthShowcase variant="verify-otp" />
        <Suspense>
          <VerifyOtpForm />
        </Suspense>
      </div>
    </div>
  );
}
