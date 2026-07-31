"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import Link from "next/link";
import { MailIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

// Khớp otpResendLimiter/OTP_RESEND_COOLDOWN_MS phía backend — chỉ để UX (disable nút),
// backend vẫn là nơi enforce thật nếu client bỏ qua giá trị này.
const RESEND_COOLDOWN_SECONDS = 60;

const verifySchema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  code: z.string().trim().regex(/^\d{6}$/, "Mã OTP gồm 6 chữ số"),
});

type FieldErrors = Partial<Record<"email" | "code", string>>;

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: () => {
      router.push("/login");
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "Xác thực thất bại, vui lòng thử lại."));
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: () => {
      setFormError(null);
      setSuccessMessage("Đã gửi mã mới, vui lòng kiểm tra email.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(getErrorMessage(error, "Không gửi lại được mã, vui lòng thử lại."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const result = verifySchema.safeParse({ email, code });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    verifyMutation.mutate(result.data);
  };

  const handleResend = () => {
    setFieldErrors({});
    const result = z.string().trim().email("Email không hợp lệ").safeParse(email);
    if (!result.success) {
      setFieldErrors({ email: result.error.issues[0]?.message });
      return;
    }
    resendMutation.mutate({ email: result.data });
  };

  return (
    <Card className="w-full max-w-sm border-0 bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="items-start gap-2 px-0 text-left">
        <CardTitle className="text-3xl font-bold text-foreground">
          Xác thực <span className="text-primary">email</span>
        </CardTitle>
        <CardDescription>Nhập mã 6 chữ số vừa được gửi tới email của bạn.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <MailIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                autoComplete="email"
                className="h-11 rounded-xl border-border bg-card/60 pl-10"
              />
            </div>
            {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Mã OTP</Label>
            <div className="relative">
              <ShieldCheckIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!fieldErrors.code}
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-11 rounded-xl border-border bg-card/60 pl-10 tracking-[0.3em]"
              />
            </div>
            {fieldErrors.code && <p className="text-sm text-destructive">{fieldErrors.code}</p>}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {successMessage && <p className="text-sm text-primary">{successMessage}</p>}

          <Button
            type="submit"
            disabled={verifyMutation.isPending}
            className="h-11 w-full rounded-xl text-base shadow-lg shadow-primary/30 hover:shadow-primary/40"
          >
            {verifyMutation.isPending ? "Đang xác thực..." : "Xác thực"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={resendMutation.isPending || cooldown > 0}
            className="h-11 w-full rounded-xl text-base"
          >
            {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : resendMutation.isPending ? "Đang gửi..." : "Gửi lại mã"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Sai email?{" "}
            <Link href="/register" className="text-primary underline underline-offset-4">
              Đăng ký lại
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
