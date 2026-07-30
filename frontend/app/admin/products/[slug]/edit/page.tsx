import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProductForm } from "@/components/admin/AdminProductForm";

export default async function EditAdminProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <ProtectedRoute requireRole="ADMIN">
      <div className="flex flex-1 justify-center p-8">
        <AdminProductForm mode="edit" slug={slug} />
      </div>
    </ProtectedRoute>
  );
}
