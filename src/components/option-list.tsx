"use client";

import type { TemplateOption, TemplateQuestion } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Pencil } from "lucide-react";

interface OptionListProps {
  question: TemplateQuestion;
  selected: string | string[] | undefined;
  customInput?: string;
  onSelectSingle: (optionId: string) => void;
  onToggleMulti: (optionId: string) => void;
  onCustomInputChange: (value: string) => void;
}

export function OptionList({
  question,
  selected,
  customInput,
  onSelectSingle,
  onToggleMulti,
  onCustomInputChange,
}: OptionListProps) {
  const isMulti = question.type === "multi";
  const canUseCustomInput = question.question_kind === "prompt_input";
  const multiSelected = isMulti ? (Array.isArray(selected) ? selected : []) : [];

  const handleOptionClick = (option: TemplateOption) => {
    if (isMulti) {
      onToggleMulti(option.id);
      return;
    }

    onSelectSingle(option.id);
  };

  return (
    <div className="flex flex-col">
      <div
        className="max-h-[340px] overflow-y-auto"
        role="listbox"
        aria-label={question.question}
      >
        {question.options.map((option) => {
          const isSelected = isMulti ? multiSelected.includes(option.id) : selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-accent",
                isSelected && "bg-accent/60",
              )}
              onClick={() => handleOptionClick(option)}
            >
              <span
                className={cn(
                  "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                  isMulti ? "rounded-sm" : "rounded-full",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </span>

              {option.preview && (
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-sm border border-border"
                  style={{
                    backgroundColor: option.preview.startsWith("#") ? option.preview : undefined,
                    backgroundImage:
                      option.preview && !option.preview.startsWith("#")
                        ? `url(${option.preview})`
                        : undefined,
                    backgroundSize: "cover",
                  }}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{option.label}</span>
                  {option.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {option.description && (
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {option.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {canUseCustomInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border">
          <Pencil className="flex-shrink-0 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={customInput ?? ""}
            onChange={(event) => onCustomInputChange(event.target.value)}
            placeholder={question.custom_input_placeholder ?? "自定义补充（可选）"}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded border border-input bg-background outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      )}
    </div>
  );
}
