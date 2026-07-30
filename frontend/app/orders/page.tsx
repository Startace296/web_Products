import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OrderHistoryList } from "@/components/order/OrderHistoryList";

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-1 justify-center">
        <OrderHistoryList />
      </div>
    </ProtectedRoute>
  );
}
