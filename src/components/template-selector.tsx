"use client";

import { templates } from "@/data/templates";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TemplateSelectorProps {
  currentId: string;
  onChange: (id: string) => void;
}

export function TemplateSelector({ currentId, onChange }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = templates.find((t) => t.id === currentId);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors"
      >
        <span className="truncate max-w-[200px]">{current?.title ?? "选择模板"}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-md border border-border bg-popover shadow-lg">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onChange(t.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-accent",
                t.id === currentId && "bg-accent/60",
              )}
            >
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {t.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
