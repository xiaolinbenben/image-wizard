"use client";

import type { GenerateResponse } from "@/lib/types";
import { Loader2, RefreshCw, AlertCircle, ArrowLeft, Download, Save } from "lucide-react";

interface ResultDisplayProps {
  loading: boolean;
  result: GenerateResponse | null;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}

export function ResultDisplay({
  loading,
  result,
  error,
  onRetry,
  onBack,
}: ResultDisplayProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#FF6600]" />
        <p className="text-sm text-muted-foreground">正在生成图片，请稍候...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <div className="text-center">
          <p className="text-base font-medium text-destructive">生成失败</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回修改
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-[#FF6600] text-white hover:bg-[#E55C00] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重试
          </button>
        </div>
      </div>
    );
  }

  if (result && result.ok) {
    const handleSaveAll = () => {
      result.images.forEach((src, i) => {
        const link = document.createElement("a");
        link.href = src;
        link.download = `generated-${i + 1}.png`;
        link.click();
      });
    };

    return (
      <div className="flex flex-col gap-6">
        {/* 图片网格 */}
        <div className="grid grid-cols-2 gap-3">
          {result.images.map((src, i) => (
            <div
              key={i}
              className="relative overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`生成结果 ${i + 1}`}
                className="w-full h-auto rounded-lg max-h-[35vh] object-contain"
              />
            </div>
          ))}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-center gap-3 py-4 border-t border-border">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回修改
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            再次生成
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg bg-[#FF6600] text-white hover:bg-[#E55C00] transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            保存全部图片
          </button>
          <button
            type="button"
            onClick={() => {}}
            className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            保存为模板
          </button>
        </div>
      </div>
    );
  }

  return null;
}
