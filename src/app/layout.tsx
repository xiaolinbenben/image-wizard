import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Wizard - 向导式生图 Demo",
  description: "通过向导式交互快速生成电商素材",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
