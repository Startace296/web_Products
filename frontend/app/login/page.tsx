import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

export default function LoginPage() {
  // class "dark" scope cục bộ (giống ProductHero): nền luôn tối + quầng sáng blur bất kể
  // site có bật dark mode toggle hay không, để form nổi bật thay vì nền trắng phẳng.
  // Bố cục 2 cột (panel quảng bá + form) lấy cảm hứng từ trang đăng nhập CellphoneS,
  // nhưng dùng màu thương hiệu + nội dung thật của TechPulse thay vì copy nguyên bản.
  return (
    <div className="dark relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16 sm:py-24">
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex w-full max-w-5xl items-center justify-center gap-16 lg:justify-between">
        <AuthShowcase variant="login" />
        <LoginForm />
      </div>
    </div>
  );
}
