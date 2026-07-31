"use client";

import { BellRingIcon, CreditCardIcon, ShieldCheckIcon, SparklesIcon, TruckIcon } from "lucide-react";

const BENEFITS = [
  {
    icon: SparklesIcon,
    title: "Viết review, xây uy tín",
    desc: "Chia sẻ trải nghiệm thật về sản phẩm bạn đã dùng.",
  },
  {
    icon: BellRingIcon,
    title: "Thông báo realtime",
    desc: "Cập nhật ngay khi đơn hàng hoặc phản hồi có thay đổi.",
  },
  {
    icon: TruckIcon,
    title: "Giao nhanh miễn phí",
    desc: "Freeship cho đơn từ 300.000đ.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Bảo hành chính hãng",
    desc: "Nguồn gốc rõ ràng, bảo hành đầy đủ.",
  },
  {
    icon: CreditCardIcon,
    title: "Trả góp 0%",
    desc: "Thanh toán linh hoạt qua VNPay.",
  },
];

const COPY = {
  login: {
    badge: "Chào mừng trở lại",
    title: (
      <>
        Đăng nhập để tiếp tục với <span className="text-primary">TechPulse</span>
      </>
    ),
    description: "Theo dõi đơn hàng, quản lý review và nhận thông báo ưu đãi realtime.",
  },
  register: {
    badge: "Công nghệ chính hãng",
    title: (
      <>
        Tham gia cộng đồng <span className="text-primary">TechPulse</span>
      </>
    ),
    description: "Tạo tài khoản để viết review, theo dõi đơn hàng và nhận ưu đãi mới nhất.",
  },
};

// Panel quảng bá bên trái form đăng nhập/đăng ký — chỉ hiện ở màn lớn (lg+), màn nhỏ
// ưu tiên hiển thị form. Dùng chung 1 component cho cả 2 trang để tránh lặp nội dung,
// khác biệt qua prop variant.
export function AuthShowcase({ variant }: { variant: "login" | "register" }) {
  const copy = COPY[variant];

  return (
    <div className="relative hidden w-full max-w-md flex-col gap-8 lg:flex">
      <div className="flex flex-col gap-4">
        <span className="w-fit rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur">
          {copy.badge}
        </span>
        <h1 className="text-3xl leading-tight font-bold text-balance text-foreground sm:text-4xl">{copy.title}</h1>
        <p className="text-balance text-muted-foreground">{copy.description}</p>
      </div>

      <ul className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-6 backdrop-blur">
        {BENEFITS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Icon className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
