import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CheckoutForm } from "@/components/cart/CheckoutForm";

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-1 justify-center">
        <CheckoutForm />
      </div>
    </ProtectedRoute>
  );
}
