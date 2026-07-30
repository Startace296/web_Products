import { ProductRail } from "./ProductRail";

// 3 dải theo đúng yêu cầu: nhiều đánh giá nhất, điểm cao nhất, mới thêm — hiện khi
// người dùng chưa search/lọc danh mục gì (xem HomePage.tsx), thay cho grid mặc định.
export function ProductRails() {
  return (
    <div className="flex flex-col gap-8">
      <ProductRail title="Được đánh giá nhiều nhất" sortBy="reviewCount" />
      <ProductRail title="Điểm cao nhất" sortBy="rating" />
      <ProductRail title="Mới thêm" sortBy="newest" />
    </div>
  );
}
