import { prisma } from "../src/config/prisma";

const products = [
  {
    name: 'iPhone 16 Pro',
    slug: "iphone-16-pro",
    description: "Flagship Apple smartphone with the A18 Pro chip and a titanium frame.",
    imageUrl: "https://images.example.com/products/iphone-16-pro.jpg",
    brand: "Apple",
    category: "Smartphone",
  },
  {
    name: "Samsung Galaxy S25 Ultra",
    slug: "samsung-galaxy-s25-ultra",
    description: "Samsung's top-tier Android phone with S Pen support and a 200MP camera.",
    imageUrl: "https://images.example.com/products/galaxy-s25-ultra.jpg",
    brand: "Samsung",
    category: "Smartphone",
  },
  {
    name: 'MacBook Pro 14" M4',
    slug: "macbook-pro-14-m4",
    description: "Apple silicon laptop built for professional creative workflows.",
    imageUrl: "https://images.example.com/products/macbook-pro-14-m4.jpg",
    brand: "Apple",
    category: "Laptop",
  },
  {
    name: "Dell XPS 15",
    slug: "dell-xps-15",
    description: "Premium Windows ultrabook with an optional OLED display.",
    imageUrl: "https://images.example.com/products/dell-xps-15.jpg",
    brand: "Dell",
    category: "Laptop",
  },
  {
    name: "Sony WH-1000XM6",
    slug: "sony-wh-1000xm6",
    description: "Industry-leading noise-cancelling wireless headphones.",
    imageUrl: "https://images.example.com/products/sony-wh-1000xm6.jpg",
    brand: "Sony",
    category: "Audio",
  },
];

async function main(): Promise<void> {
  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
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
