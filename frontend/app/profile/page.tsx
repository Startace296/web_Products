import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProfileView } from "@/components/auth/ProfileView";

export default function ProfilePage() {
  // class "dark" scope cục bộ (giống ProductHero/login/register): nền luôn tối + quầng
  // sáng blur, để trang tài khoản có cùng ngôn ngữ thiết kế nổi bật thay vì nền trắng phẳng.
  return (
    <ProtectedRoute>
      <div className="dark relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16 sm:py-24">
        <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-accent/20 blur-3xl" />
        <ProfileView />
      </div>
    </ProtectedRoute>
  );
}
