import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CartView } from "@/components/cart/CartView";

export default function CartPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-1 justify-center">
        <CartView />
      </div>
    </ProtectedRoute>
  );
}
