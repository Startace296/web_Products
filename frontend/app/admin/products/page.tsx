import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProductList } from "@/components/admin/AdminProductList";

export default function AdminProductsPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="flex flex-1 justify-center">
        <AdminProductList />
      </div>
    </ProtectedRoute>
  );
}
