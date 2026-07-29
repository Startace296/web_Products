"use client";

import { Input } from "@/components/ui/input";

interface ProductSearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearchInput({ value, onChange }: ProductSearchInputProps) {
  return (
    <Input
      type="search"
      placeholder="Tìm kiếm sản phẩm..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full sm:w-64"
    />
  );
}
