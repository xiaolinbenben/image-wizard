"use client";

import { useState } from "react";
import type { PromptBuildResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BookOpen, FileText, SlidersHorizontal } from "lucide-react";

interface SummaryPreviewProps {
  buildResult: PromptBuildResult;
  className?: string;
}

type Tab = "summary" | "prompt" | "generation_params";

export function SummaryPreview({ buildResult, className }: SummaryPreviewProps) {
  const [tab, setTab] = useState<Tab>("summary");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "summary", label: "摘要", icon: <BookOpen className="w-3 h-3" /> },
    { id: "prompt", label: "提示词", icon: <FileText className="w-3 h-3" /> },
    {
      id: "generation_params",
      label: "生成参数",
      icon: <SlidersHorizontal className="w-3 h-3" />,
    },
  ];

  return (
    <div
      className={cn(
        "flex flex-col border border-border rounded-lg bg-card shadow-sm overflow-hidden sticky top-12",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 px-3 pt-3 pb-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
              tab === item.id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div className="px-3 pb-3 pt-1 max-h-[400px] overflow-y-auto">
        {tab === "summary" &&
          (buildResult.summaryItems.length > 0 ? (
            <div className="space-y-2">
              {buildResult.summaryItems.map((item, index) => (
                <div key={`${item.question}-${index}`}>
                  <div className="text-[10px] text-muted-foreground leading-tight">{item.question}</div>
                  <div className="text-xs font-medium text-foreground mt-0.5">{item.answer}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">尚未选择任何选项</p>
          ))}

        {tab === "prompt" && (
          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-all font-mono leading-relaxed">
            {buildResult.prompt}
          </pre>
        )}

        {tab === "generation_params" &&
          (buildResult.generationParamItems.length > 0 ? (
            <div className="space-y-2">
              {buildResult.generationParamItems.map((item, index) => (
                <div key={`${item.question}-${index}`}>
                  <div className="text-[10px] text-muted-foreground leading-tight">{item.question}</div>
                  <div className="text-xs font-medium text-foreground mt-0.5">{item.answer}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">尚未设置生成参数</p>
          ))}
      </div>
    </div>
  );
}
