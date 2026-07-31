// Tầng: validation — Zod schema cho product.
import { z } from "zod";

// "newest" giữ nguyên hành vi mặc định trước đây (createdAt desc) — không đổi contract
// cũ nếu FE không gửi sortBy.
export const listProductsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sortBy: z.enum(["newest", "reviewCount", "rating"]).default("newest"),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

// slug: dùng làm định danh public trong URL (/products/:slug) — chỉ chữ thường/số,
// nối bằng "-", để URL luôn sạch và ổn định.
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric, separated by hyphens");

// Mảng có thứ tự (không phải object key-value) — xem lý do đầy đủ ở schema.prisma
// Product.specifications. max(30): đủ rộng cho mọi loại sản phẩm, vẫn chặn được payload
// vô hạn dòng.
const specificationsSchema = z
  .array(
    z.object({
      label: z.string().trim().min(1, "Specification label is required").max(100),
      value: z.string().trim().min(1, "Specification value is required").max(300),
    })
  )
  .max(30, "At most 30 specifications")
  .optional();

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
    slug: slugSchema,
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
    imageUrl: z.string().trim().url("Invalid image URL").optional(),
    brand: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1, "Category is required").max(100),
    // avgRating/reviewCount KHÔNG nằm trong schema tạo/sửa — đây là field denormalize,
    // chỉ reviewService được quyền ghi (xem reviewService.syncProductAggregates).
    price: z.coerce.number().int().nonnegative("Price cannot be negative"),
    // Giá niêm yết trước giảm — optional, NULL/không gửi nghĩa là không giảm giá.
    originalPrice: z.coerce.number().int().nonnegative().optional(),
    stock: z.coerce.number().int().nonnegative("Stock cannot be negative").default(0),
    specifications: specificationsSchema,
  })
  .refine((data) => data.originalPrice === undefined || data.originalPrice > data.price, {
    message: "Original price must be greater than price",
    path: ["originalPrice"],
  });

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().trim().min(10).max(5000).optional(),
    imageUrl: z.string().trim().url("Invalid image URL").optional(),
    brand: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional(),
    price: z.coerce.number().int().nonnegative().optional(),
    // z.null() cho phép admin XOÁ giảm giá đang có (gửi originalPrice: null) — undefined
    // (không gửi field) nghĩa là "không đổi", khác với null (đổi về "không giảm giá").
    originalPrice: z.coerce.number().int().nonnegative().nullable().optional(),
    stock: z.coerce.number().int().nonnegative().optional(),
    specifications: specificationsSchema,
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    (data) => {
      if (data.originalPrice === undefined || data.originalPrice === null || data.price === undefined) return true;
      return data.originalPrice > data.price;
    },
    { message: "Original price must be greater than price", path: ["originalPrice"] }
  );

export const productIdParamSchema = z.object({
  id: z.string().cuid("Invalid product id"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
