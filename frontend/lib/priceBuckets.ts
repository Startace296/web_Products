// Nguồn dùng chung cho ProductPriceFilter (sidebar desktop) và ProductPriceFilterSelect
// (dropdown màn hình nhỏ) — cả 2 cùng đọc GET /products/price-range rồi tự chia mốc ở
// đây, thay vì hardcode mốc cố định: catalog đổi (thêm sản phẩm rất rẻ/rất đắt) thì mốc
// tự đổi theo, không cần sửa code.
export interface PriceRange {
  min?: number;
  max?: number;
}

export interface PriceBucket {
  label: string;
  min?: number;
  max?: number;
}

// Làm tròn 1 bước chia về bội số "đẹp" (1/2/5 × 10^n) — cùng thuật toán "nice numbers"
// hay dùng để chọn khoảng cách tick trên trục biểu đồ, áp dụng ở đây cho khoảng giá thay
// vì tick trục. Nếu chia đều máy móc sẽ ra mốc lẻ kiểu "2.333.333đ", rất khó đọc.
const niceStep = (rawStep: number): number => {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
};

const trimTrailingZero = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Định dạng ngắn kiểu Việt Nam ("2 triệu", "1.5 triệu", "500 nghìn") — khác với
// Intl.NumberFormat currency đầy đủ ("2.000.000 ₫") đã dùng cho giá sản phẩm, vì mốc lọc
// cần ngắn gọn để hiện trong danh sách checkbox/dropdown.
const formatShort = (value: number): string => {
  if (value >= 1_000_000) return `${trimTrailingZero(value / 1_000_000)} triệu`;
  if (value >= 1_000) return `${trimTrailingZero(value / 1_000)} nghìn`;
  return `${value}đ`;
};

// Chia [0, max] thành tối đa `desiredBucketCount` khoảng: "Dưới A", các khoảng giữa, và
// "Trên Z". Số khoảng thực tế có thể ít hơn nếu max nhỏ (vd toàn bộ catalog dưới 2 triệu
// thì không cần chia tới 6 khoảng) — đây là hành vi mong muốn, không phải thiếu sót.
export const buildPriceBuckets = (max: number, desiredBucketCount = 6): PriceBucket[] => {
  if (max <= 0) return [];

  const middleCount = Math.max(desiredBucketCount - 2, 1);
  const step = niceStep(max / (middleCount + 1));

  const boundaries: number[] = [];
  for (let b = step; b < max; b += step) {
    boundaries.push(b);
  }
  // max nhỏ hơn 1 step (catalog rất hẹp) — vẫn cần ít nhất 1 mốc để tạo "Dưới"/"Trên".
  if (boundaries.length === 0) boundaries.push(step);

  const buckets: PriceBucket[] = [{ label: `Dưới ${formatShort(boundaries[0])}`, max: boundaries[0] }];

  for (let i = 0; i < boundaries.length - 1; i++) {
    buckets.push({
      label: `Từ ${formatShort(boundaries[i])} - ${formatShort(boundaries[i + 1])}`,
      min: boundaries[i],
      max: boundaries[i + 1],
    });
  }

  const last = boundaries[boundaries.length - 1];
  buckets.push({ label: `Trên ${formatShort(last)}`, min: last });

  return buckets;
};
