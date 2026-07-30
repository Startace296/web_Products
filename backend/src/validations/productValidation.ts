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

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
  slug: slugSchema,
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  imageUrl: z.string().trim().url("Invalid image URL").optional(),
  brand: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1, "Category is required").max(100),
  // avgRating/reviewCount KHÔNG nằm trong schema tạo/sửa — đây là field denormalize,
  // chỉ reviewService được quyền ghi (xem reviewService.syncProductAggregates).
  price: z.coerce.number().int().nonnegative("Price cannot be negative"),
  stock: z.coerce.number().int().nonnegative("Stock cannot be negative").default(0),
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
    stock: z.coerce.number().int().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const productIdParamSchema = z.object({
  id: z.string().cuid("Invalid product id"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
