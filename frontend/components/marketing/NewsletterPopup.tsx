"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { CheckIcon, MailIcon, PhoneIcon, TicketPercentIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { newsletterApi } from "@/services/newsletterApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

const SHOW_DELAY_MS = 5000;
const SNOOZE_DAYS = 7;
const STORAGE_SUBSCRIBED = "techpulse:newsletter-subscribed";
const STORAGE_DISMISSED_UNTIL = "techpulse:newsletter-dismissed-until";

const subscribeSchema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email").email("Email không hợp lệ"),
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)\d{9,10}$/, "Số điện thoại không hợp lệ")
    .optional()
    .or(z.literal("")),
});

type FieldErrors = Partial<Record<"email" | "phone", string>>;

// Popup thu email/SĐT đổi voucher — hiện tự động sau 1 khoảng trễ trên trang chủ (xem
// HomePage.tsx), tối đa 1 lần/phiên và tự "ngủ" 7 ngày sau khi bị đóng, không hỏi lại
// nếu đã đăng ký thành công. Đọc localStorage nên toàn bộ logic hiện/ẩn nằm trong effect,
// không chặn render đầu (SSR không có localStorage).
export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [agreedError, setAgreedError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscribed = localStorage.getItem(STORAGE_SUBSCRIBED) === "1";
    const dismissedUntil = Number(localStorage.getItem(STORAGE_DISMISSED_UNTIL) ?? 0);
    if (subscribed || dismissedUntil > Date.now()) return;

    const showTimer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: newsletterApi.subscribe,
    onSuccess: () => {
      localStorage.setItem(STORAGE_SUBSCRIBED, "1");
      closeTimerRef.current = setTimeout(() => setOpen(false), 2500);
    },
    onError: (error) => {
      setFormError(getErrorMessage(error, "Đăng ký thất bại, vui lòng thử lại."));
    },
  });

  // Đóng popup bằng bất kỳ cách nào (X, backdrop, Esc) mà chưa đăng ký thành công ->
  // "ngủ" 7 ngày, tránh làm phiền lại ngay lần ghé thăm tiếp theo.
  const handleOpenChange = (next: boolean) => {
    if (!next && !subscribeMutation.isSuccess) {
      localStorage.setItem(STORAGE_DISMISSED_UNTIL, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    }
    setOpen(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const result = subscribeSchema.safeParse({ email, phone });
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

    if (!agreed) {
      setAgreedError("Bạn cần đồng ý để nhận ưu đãi");
      return;
    }
    setAgreedError(null);

    subscribeMutation.mutate({ email: result.data.email, phone: result.data.phone || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="grid sm:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4 p-6 sm:p-8">
            {subscribeMutation.isSuccess ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckIcon className="size-6" />
                </span>
                <DialogTitle className="text-xl">Cảm ơn bạn đã đăng ký!</DialogTitle>
                <DialogDescription>Voucher 10% sẽ được gửi tới email của bạn trong 24h tới.</DialogDescription>
              </div>
            ) : (
              <>
                <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-medium tracking-wide text-accent uppercase">
                  Ưu đãi thành viên mới
                </span>
                <DialogTitle className="text-2xl font-bold text-balance">
                  Nhận ngay voucher <span className="text-accent">10%</span>
                </DialogTitle>
                <DialogDescription>
                  Đăng ký nhận tin khuyến mãi — ưu đãi mới nhất gửi thẳng tới email của bạn.
                </DialogDescription>

                <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-3" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newsletter-email" className="sr-only">
                      Email
                    </Label>
                    <div className="relative">
                      <MailIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="newsletter-email"
                        type="email"
                        placeholder="Email *"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-invalid={!!fieldErrors.email}
                        autoComplete="email"
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                    {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="newsletter-phone" className="sr-only">
                      Số điện thoại
                    </Label>
                    <div className="relative">
                      <PhoneIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="newsletter-phone"
                        type="tel"
                        placeholder="Số điện thoại (không bắt buộc)"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        aria-invalid={!!fieldErrors.phone}
                        autoComplete="tel"
                        className="h-11 rounded-xl pl-10"
                      />
                    </div>
                    {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}
                  </div>

                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => {
                        setAgreed(e.target.checked);
                        if (e.target.checked) setAgreedError(null);
                      }}
                      className="mt-0.5 size-3.5 shrink-0 accent-primary"
                    />
                    Tôi đồng ý nhận thông tin khuyến mãi từ TechPulse qua email/SĐT.
                  </label>
                  {agreedError && <p className="text-sm text-destructive">{agreedError}</p>}

                  {formError && <p className="text-sm text-destructive">{formError}</p>}

                  <Button
                    type="submit"
                    disabled={subscribeMutation.isPending}
                    className="h-11 w-full rounded-xl bg-accent text-base text-accent-foreground hover:bg-accent/90"
                  >
                    {subscribeMutation.isPending ? "Đang đăng ký..." : "Đăng ký ngay"}
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="dark relative hidden flex-col items-center justify-center gap-3 overflow-hidden bg-background p-8 sm:flex">
            <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-accent/30 blur-3xl" />
            <span className="relative flex size-20 items-center justify-center rounded-full bg-accent/15 text-accent">
              <TicketPercentIcon className="size-10" />
            </span>
            <p className="relative text-4xl font-extrabold text-foreground">10%</p>
            <p className="relative -rotate-3 rounded-full border border-accent/40 bg-accent/10 px-4 py-1 text-xs font-bold tracking-widest text-accent uppercase">
              Voucher
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
