import { ProductDetail } from "@/components/product/ProductDetail";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex flex-1 justify-center">
      <ProductDetail slug={slug} />
    </div>
  );
}
