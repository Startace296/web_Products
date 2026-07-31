import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ProductCard.tsx set unoptimized trên MỌI ảnh sản phẩm (imageUrl do admin nhập tay,
    // có thể là bất kỳ domain nào — không whitelist trước hết được), nên remotePatterns
    // KHÔNG còn được next/image dùng tới cho ảnh sản phẩm (unoptimized bỏ qua hẳn bước
    // check domain này). Giữ lại domain hay gặp nhất trong dữ liệu cũ để phòng khi sau
    // này có chỗ khác dùng next/image có tối ưu (unoptimized=false). placehold.co đã bỏ
    // hẳn khỏi code (ProductCard giờ dùng icon placeholder cục bộ, không gọi dịch vụ
    // ngoài nữa) nên không cần whitelist domain đó nữa.
    remotePatterns: [{ protocol: "https", hostname: "images.example.com" }],
  },
};

export default nextConfig;
