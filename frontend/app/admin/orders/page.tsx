import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminOrderList } from "@/components/admin/AdminOrderList";

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="flex flex-1 justify-center">
        <AdminOrderList />
      </div>
    </ProtectedRoute>
  );
}
