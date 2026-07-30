import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProductForm } from "@/components/admin/AdminProductForm";

export default function NewAdminProductPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="flex flex-1 justify-center p-8">
        <AdminProductForm mode="create" />
      </div>
    </ProtectedRoute>
  );
}
