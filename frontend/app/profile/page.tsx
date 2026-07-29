import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ProfileView } from "@/components/auth/ProfileView";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-1 items-center justify-center p-8">
        <ProfileView />
      </div>
    </ProtectedRoute>
  );
}
