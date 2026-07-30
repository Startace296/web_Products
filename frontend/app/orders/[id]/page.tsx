import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OrderDetailView } from "@/components/order/OrderDetailView";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;

  return (
    <ProtectedRoute>
      <div className="flex flex-1 justify-center">
        <OrderDetailView orderId={id} paymentResult={payment === "success" || payment === "failed" ? payment : undefined} />
      </div>
    </ProtectedRoute>
  );
}
