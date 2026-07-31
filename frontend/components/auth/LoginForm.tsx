"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import Link from "next/link";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/getErrorMessage";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, accessToken }) => {
      setAuth(accessToken, user);
      router.push("/");
    },
    onError: (error) => {
      // Backend cố tình trả cùng 1 message cho sai email lẫn sai mật khẩu (chống dò email) — giữ nguyên ở đây.
      setFormError(getErrorMessage(error, "Email hoặc mật khẩu không đúng."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
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
    loginMutation.mutate(result.data);
  };

  return (
    // Không dùng khung Card có viền/nền riêng nữa — form nằm trực tiếp trên nền tối của
    // page wrapper (xem app/login/page.tsx), đứng cạnh AuthShowcase như 1 khối liền mạch.
    <Card className="w-full max-w-sm border-0 bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="items-start gap-2 px-0 text-left">
        <CardTitle className="text-3xl font-bold text-foreground">
          Đăng nhập <span className="text-primary">TechPulse</span>
        </CardTitle>
        <CardDescription>Đăng nhập để viết review và theo dõi thông báo.</CardDescription>
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
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                autoComplete="current-password"
                className="h-11 rounded-xl border-border bg-card/60 pr-10 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="h-11 w-full rounded-xl text-base shadow-lg shadow-primary/30 hover:shadow-primary/40"
          >
            {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary underline underline-offset-4">
              Đăng ký
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
