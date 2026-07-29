import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/QueryProvider";
import { SocketProvider } from "@/providers/SocketProvider";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechPulse",
  description: "Nền tảng đánh giá sản phẩm công nghệ, cập nhật realtime.",
};

// RootLayout giữ nguyên là Server Component — provider ("use client") chỉ bọc
// quanh {children}, không bọc <html>/<body>, để phần tĩnh vẫn được Next.js
// tối ưu render trên server (theo hướng dẫn chính thức của Next 16).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <SocketProvider>
            <Navbar />
            <main className="flex flex-1 flex-col">{children}</main>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
