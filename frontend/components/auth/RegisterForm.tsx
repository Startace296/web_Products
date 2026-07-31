"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import Link from "next/link";
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/services/authApi";
import { useAuthStore } from "@/store/authStore";
import { getErrorMessage } from "@/lib/getErrorMessage";

// Mirror rules validate ở backend (validations/authValidation.ts) để báo lỗi ngay,
// nhưng backend vẫn là nơi enforce thật — đây chỉ là UX, không thay thế validate server.
const registerSchema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(100),
  email: z.string().trim().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự")
    .regex(/[a-z]/, "Mật khẩu cần ít nhất 1 chữ thường")
    .regex(/[A-Z]/, "Mật khẩu cần ít nhất 1 chữ hoa")
    .regex(/[0-9]/, "Mật khẩu cần ít nhất 1 chữ số"),
});

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user, accessToken }) => {
      setAuth(accessToken, user);
      router.push("/");
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "Đăng ký thất bại, vui lòng thử lại."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = registerSchema.safeParse({ name, email, password });
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
    registerMutation.mutate(result.data);
  };

  return (
    // Không dùng khung Card có viền/nền riêng nữa — form nằm trực tiếp trên nền tối của
    // page wrapper (xem app/register/page.tsx), đứng cạnh AuthShowcase như 1 khối liền mạch.
    <Card className="w-full max-w-sm border-0 bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="items-start gap-2 px-0 text-left">
        <CardTitle className="text-3xl font-bold text-foreground">
          Tạo tài khoản <span className="text-primary">TechPulse</span>
        </CardTitle>
        <CardDescription>Tham gia TechPulse để đánh giá sản phẩm công nghệ.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Tên hiển thị</Label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!fieldErrors.name}
                autoComplete="name"
                className="h-11 rounded-xl border-border bg-card/60 pl-10"
              />
            </div>
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>

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
                autoComplete="new-password"
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
            disabled={registerMutation.isPending}
            className="h-11 w-full rounded-xl text-base shadow-lg shadow-primary/30 hover:shadow-primary/40"
          >
            {registerMutation.isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
