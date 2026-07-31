"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { productApi, type CreateProductInput, type Product, type UpdateProductInput } from "@/services/productApi";
import { getErrorMessage } from "@/lib/getErrorMessage";

// Mirror rules validate ở backend (validations/productValidation.ts) để báo lỗi ngay,
// nhưng backend vẫn là nơi enforce thật.
const productFormSchema = z.object({
  name: z.string().trim().min(2, "Tên phải có ít nhất 2 ký tự").max(200),
  slug: z
    .string()
    .trim()
    .min(2, "Slug phải có ít nhất 2 ký tự")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số, nối bằng dấu gạch ngang"),
  description: z.string().trim().min(10, "Mô tả phải có ít nhất 10 ký tự").max(5000),
  imageUrl: z.string().trim().url("URL ảnh không hợp lệ").optional(),
  brand: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1, "Vui lòng nhập danh mục").max(100),
  price: z.coerce.number({ message: "Giá phải là số" }).int("Giá phải là số nguyên").nonnegative("Giá không được âm"),
  // null = không giảm giá (khác undefined — form luôn gửi field này, xem handleSubmit).
  originalPrice: z.coerce
    .number({ message: "Giá gốc phải là số" })
    .int("Giá gốc phải là số nguyên")
    .nonnegative("Giá gốc không được âm")
    .nullable()
    .optional(),
  stock: z.coerce
    .number({ message: "Tồn kho phải là số" })
    .int("Tồn kho phải là số nguyên")
    .nonnegative("Tồn kho không được âm"),
  specifications: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Mỗi thông số cần có cả tên và giá trị"),
        value: z.string().trim().min(1, "Mỗi thông số cần có cả tên và giá trị"),
      })
    )
    .max(30, "Tối đa 30 thông số")
    .optional(),
}).refine((data) => data.originalPrice == null || data.originalPrice > data.price, {
  message: "Giá gốc phải lớn hơn giá bán",
  path: ["originalPrice"],
});

// id chỉ dùng làm React key phía client (giúp xoá đúng dòng giữa danh sách không lệch
// DOM/focus) — không gửi lên backend, xem cleanedSpecifications trong handleSubmit.
let specRowSeq = 0;
const nextSpecRowId = () => `spec-${++specRowSeq}`;

interface SpecRow {
  id: string;
  label: string;
  value: string;
}

type FieldErrors = Partial<Record<keyof CreateProductInput, string>>;

// Dựng regex từ chuỗi escape thay vì viết ký tự combining-mark trực tiếp trong source —
// literal U+0300..U+036F rất dễ bị mangle bởi encoding của editor/terminal (đã gặp lỗi
// tương tự với dấu tiếng Việt qua Bash tool trước đó trong dự án này).
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

// Bỏ dấu tiếng Việt + chuẩn hoá về dạng slug — chỉ chạy 1 lần khi bấm nút "Tạo từ tên",
// không tự động đồng bộ theo từng phím gõ (tránh đè slug admin đã tự sửa tay).
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AdminProductFormFields({ mode, product }: { mode: "create" | "edit"; product?: Product }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [originalPrice, setOriginalPrice] = useState(product?.originalPrice != null ? String(product.originalPrice) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [specRows, setSpecRows] = useState<SpecRow[]>(
    () => product?.specifications?.map((spec) => ({ id: nextSpecRowId(), ...spec })) ?? []
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const addSpecRow = () => setSpecRows((prev) => [...prev, { id: nextSpecRowId(), label: "", value: "" }]);
  const removeSpecRow = (id: string) => setSpecRows((prev) => prev.filter((row) => row.id !== id));
  const updateSpecRow = (id: string, field: "label" | "value", value: string) =>
    setSpecRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));

  const invalidateProductQueries = () => {
    // Prefix match: xoá cache cả list ["products", {...}], dải ["products","rail",...]
    // lẫn chi tiết ["product", slug] — trang Home/chi tiết phản ánh thay đổi ngay.
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product"] });
  };

  const createMutation = useMutation({
    mutationFn: productApi.create,
    onSuccess: () => {
      invalidateProductQueries();
      router.push("/admin/products");
    },
    onError: (error) => setFormError(getErrorMessage(error, "Tạo sản phẩm thất bại.")),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateProductInput) => productApi.update(product!.id, input),
    onSuccess: () => {
      invalidateProductQueries();
      router.push("/admin/products");
    },
    onError: (error) => setFormError(getErrorMessage(error, "Cập nhật sản phẩm thất bại.")),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Bỏ dòng admin chưa động tới (cả 2 ô đều rỗng) trước khi validate — 1 dòng chỉ điền
    // 1 trong 2 ô vẫn được coi là lỗi thật (Zod bắt ở dưới), khác với dòng hoàn toàn trống.
    const cleanedSpecifications = specRows
      .map((row) => ({ label: row.label.trim(), value: row.value.trim() }))
      .filter((row) => row.label !== "" || row.value !== "");

    const result = productFormSchema.safeParse({
      name,
      slug,
      description,
      imageUrl: imageUrl.trim() === "" ? undefined : imageUrl.trim(),
      brand: brand.trim() === "" ? undefined : brand.trim(),
      category,
      price,
      // Rỗng -> null ("không giảm giá" / "xoá giảm giá đang có"), không phải undefined
      // ("không đổi") — form luôn thể hiện ý định rõ ràng của admin tại thời điểm submit.
      originalPrice: originalPrice.trim() === "" ? null : originalPrice,
      stock,
      specifications: cleanedSpecifications,
    });

    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    const { originalPrice: validatedOriginalPrice, ...rest } = result.data;

    if (mode === "create") {
      // Backend createProductSchema không nhận null cho originalPrice (chỉ optional) —
      // rỗng nghĩa là "không giảm giá", nên bỏ hẳn field thay vì gửi null.
      createMutation.mutate(validatedOriginalPrice != null ? { ...rest, originalPrice: validatedOriginalPrice } : rest);
    } else {
      // updateProductSchema chấp nhận null tường minh để XOÁ giảm giá hiện có — luôn gửi
      // field này (không omit) để rỗng trên form thực sự xoá được discount cũ.
      updateMutation.mutate({ ...rest, originalPrice: validatedOriginalPrice });
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Thêm sản phẩm" : `Sửa: ${product?.name}`}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Tên sản phẩm</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug (dùng trong URL)</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                aria-invalid={!!fieldErrors.slug}
                placeholder="vi-du-ten-san-pham"
              />
              <Button type="button" variant="outline" className="shrink-0" onClick={() => setSlug(slugify(name))}>
                Tạo từ tên
              </Button>
            </div>
            {fieldErrors.slug && <p className="text-sm text-destructive">{fieldErrors.slug}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!fieldErrors.description}
              rows={4}
            />
            {fieldErrors.description && <p className="text-sm text-destructive">{fieldErrors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Danh mục</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-invalid={!!fieldErrors.category}
                placeholder="Smartphone, Laptop, Audio..."
              />
              {fieldErrors.category && <p className="text-sm text-destructive">{fieldErrors.category}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Thương hiệu (tuỳ chọn)</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Giá (VNĐ)</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={!!fieldErrors.price}
              />
              {fieldErrors.price && <p className="text-sm text-destructive">{fieldErrors.price}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Tồn kho</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                aria-invalid={!!fieldErrors.stock}
              />
              {fieldErrors.stock && <p className="text-sm text-destructive">{fieldErrors.stock}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="originalPrice">Giá gốc (tuỳ chọn)</Label>
            <Input
              id="originalPrice"
              type="number"
              min={0}
              step={1000}
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              aria-invalid={!!fieldErrors.originalPrice}
              placeholder="Để trống nếu không giảm giá"
            />
            {fieldErrors.originalPrice && <p className="text-sm text-destructive">{fieldErrors.originalPrice}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="imageUrl">URL ảnh (tuỳ chọn)</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} aria-invalid={!!fieldErrors.imageUrl} />
            {fieldErrors.imageUrl && <p className="text-sm text-destructive">{fieldErrors.imageUrl}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Thông số kỹ thuật (tuỳ chọn)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSpecRow}>
                <PlusIcon />
                Thêm dòng
              </Button>
            </div>

            {specRows.length === 0 && <p className="text-sm text-muted-foreground">Chưa có thông số nào.</p>}

            {specRows.map((row) => (
              <div key={row.id} className="flex gap-2">
                <Input
                  value={row.label}
                  onChange={(e) => updateSpecRow(row.id, "label", e.target.value)}
                  placeholder="Tên (vd: Màn hình)"
                  className="flex-1"
                />
                <Input
                  value={row.value}
                  onChange={(e) => updateSpecRow(row.id, "value", e.target.value)}
                  placeholder="Giá trị (vd: 6.7 inch OLED)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeSpecRow(row.id)}
                  aria-label="Xoá dòng thông số"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            {fieldErrors.specifications && <p className="text-sm text-destructive">{fieldErrors.specifications}</p>}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Đang lưu..." : mode === "create" ? "Tạo sản phẩm" : "Lưu thay đổi"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
              Huỷ
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface AdminProductFormProps {
  mode: "create" | "edit";
  // Bắt buộc khi mode === "edit" — dùng slug (không phải id) để khớp route công khai
  // /products/[slug] đã có sẵn, tái dùng productApi.getBySlug thay vì thêm endpoint mới.
  slug?: string;
}

export function AdminProductForm({ mode, slug }: AdminProductFormProps) {
  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productApi.getBySlug(slug!),
    enabled: mode === "edit" && !!slug,
  });

  if (mode === "create") {
    return <AdminProductFormFields mode="create" />;
  }

  if (isLoading) {
    return (
      <div className="flex w-full max-w-xl flex-col gap-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return <p className="text-sm text-destructive">Không tìm thấy sản phẩm.</p>;
  }

  // key={product.id}: mount lại đúng 1 lần khi data thật đã sẵn sàng, để các useState
  // trong AdminProductFormFields nhận giá trị khởi tạo (lazy initializer) từ product —
  // KHÔNG dùng useEffect để setState sau khi fetch xong (bị react-hooks/set-state-in-effect
  // chặn, xem OrderDetailView.tsx cho cùng vấn đề đã gặp trước đó).
  return <AdminProductFormFields key={product.id} mode="edit" product={product} />;
}
