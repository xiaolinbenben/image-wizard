import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <div className="flex items-center gap-2">
        <Sparkles className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Image Wizard</h1>
      </div>
      <p className="text-muted-foreground text-center max-w-md">
        向导式生图 — 无需任何 AI 知识，点点点完成模型选择、参数配置与风格设定，系统自动生成图片
      </p>
      <Link
        href="/wizard"
        className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        开始体验
      </Link>
    </main>
  );
}
