// Nguồn dùng chung cho mọi nơi cần liệt kê category — ProductCategoryFilter (dropdown,
// dùng ở màn hình nhỏ) và CategorySidebar (danh sách dọc, desktop) cùng đọc từ đây thay
// vì mỗi nơi tự khai báo 1 mảng riêng.
// Backend chưa có endpoint liệt kê category riêng (bước 4 chỉ hỗ trợ filter theo
// category có sẵn) — hardcode tạm theo dữ liệu seed, cần đổi sang gọi API nếu category
// trở nên động/nhiều hơn.
export const PRODUCT_CATEGORIES = ["Smartphone", "Laptop", "Đồng hồ"];
