import { prisma } from "../src/config/prisma";

const products = [
  {
    name: 'iPhone 16 Pro',
    slug: "iphone-16-pro",
    description: "Flagship Apple smartphone with the A18 Pro chip and a titanium frame.",
    imageUrl: "https://images.example.com/products/iphone-16-pro.jpg",
    brand: "Apple",
    category: "Smartphone",
    price: 29_990_000,
    originalPrice: 32_990_000,
    stock: 40,
  },
  {
    name: "Samsung Galaxy S25 Ultra",
    slug: "samsung-galaxy-s25-ultra",
    description: "Samsung's top-tier Android phone with S Pen support and a 200MP camera.",
    imageUrl: "https://images.example.com/products/galaxy-s25-ultra.jpg",
    brand: "Samsung",
    category: "Smartphone",
    price: 33_990_000,
    stock: 35,
  },
  {
    name: 'MacBook Pro 14" M4',
    slug: "macbook-pro-14-m4",
    description: "Apple silicon laptop built for professional creative workflows.",
    imageUrl: "https://images.example.com/products/macbook-pro-14-m4.jpg",
    brand: "Apple",
    category: "Laptop",
    price: 42_990_000,
    originalPrice: 45_990_000,
    stock: 15,
  },
  {
    name: "Dell XPS 15",
    slug: "dell-xps-15",
    description: "Premium Windows ultrabook with an optional OLED display.",
    imageUrl: "https://images.example.com/products/dell-xps-15.jpg",
    brand: "Dell",
    category: "Laptop",
    price: 45_990_000,
    stock: 12,
  },
  {
    name: "Sony WH-1000XM6",
    slug: "sony-wh-1000xm6",
    description: "Industry-leading noise-cancelling wireless headphones.",
    imageUrl: "https://images.example.com/products/sony-wh-1000xm6.jpg",
    brand: "Sony",
    category: "Audio",
    price: 8_990_000,
    originalPrice: 9_990_000,
    stock: 60,
  },
];

async function main(): Promise<void> {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      // update thay vì {} : chạy lại seed trong lúc dev sẽ refresh giá/tồn kho —
      // vô hại kể cả khi đã có Order thật, vì OrderItem đã tự snapshot giá riêng.
      // originalPrice không có trong 2/5 sản phẩm (Samsung, Dell) — Prisma cần giá trị
      // tường minh null để XOÁ giảm giá cũ nếu seed chạy lại sau khi seed trước đó/admin
      // đã set originalPrice cho sản phẩm đó, không phải omit field (omit = "không đổi").
      update: {
        price: product.price,
        originalPrice: "originalPrice" in product ? product.originalPrice : null,
        stock: product.stock,
      },
      create: product,
    });
  }

  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
