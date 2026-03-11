"use client";

import { useCallback, useEffect, useState } from "react";
import type { Template, GenerateResponse } from "@/lib/types";
import { templates, getTemplateById } from "@/data/templates";
import { useWizard } from "@/hooks/use-wizard";
import { usePriceEstimate } from "@/hooks/use-price-estimate";
import { OptionList } from "./option-list";
import { SummaryPreview } from "./summary-preview";
import { ResultDisplay } from "./result-display";
import { ArrowLeft, ArrowRight, Sparkles, ChevronRight, MousePointerClick, Keyboard, Info } from "lucide-react";

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    target.closest("[contenteditable='true']") !== null
  );
}

export function WizardPanel() {
  const [template, setTemplate] = useState<Template | null>(null);
  const wizard = useWizard(template ?? templates[0]);
  const priceEstimate = usePriceEstimate(wizard.buildResult.meta);

  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 选择模板（第一步）
  const handleTemplateSelect = useCallback(
    (id: string) => {
      const t = getTemplateById(id);
      if (t) {
        setTemplate(t);
        wizard.setTemplate(id);
        setShowResult(false);
        setGenResult(null);
        setGenError(null);
      }
    },
    [wizard],
  );

  // 生成
  const handleGenerate = useCallback(async () => {
    if (!template) return;
    setGenLoading(true);
    setGenError(null);
    setGenResult(null);
    setShowResult(true);

    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template.id,
          selections: wizard.state.selections,
          custom_inputs: wizard.state.customInputs,
          prompt: wizard.buildResult.prompt,
          meta: wizard.buildResult.meta,
        }),
      });
      const data: GenerateResponse = await resp.json();
      if (!data.ok) {
        setGenError(data.error ?? "生成失败");
      } else {
        setGenResult(data);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "网络请求失败");
    } finally {
      setGenLoading(false);
    }
  }, [template, wizard]);

  const handleRetry = () => handleGenerate();
  const handleBackFromResult = () => setShowResult(false);
  const completedQuestionIds = wizard.state.completedQuestionIds;
  const hasCurrentAnswer = wizard.currentQuestion
    ? wizard.isQuestionAnswered(wizard.currentQuestion)
    : false;

  useEffect(() => {
    if (!template || !wizard.currentQuestion) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }

      if (isTextEntryElement(event.target)) {
        return;
      }

      event.preventDefault();

      if (!hasCurrentAnswer) {
        return;
      }
      wizard.next();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasCurrentAnswer, template, wizard.currentQuestion, wizard.next]);

  // 返回模板选择
  const handleBackToTemplates = () => {
    setTemplate(null);
    wizard.reset();
    setShowResult(false);
    setGenResult(null);
    setGenError(null);
  };

  /* ---------------------------------------------------------------- */
  /*  渲染：结果视图                                                    */
  /* ---------------------------------------------------------------- */
  if (showResult && template) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <ResultDisplay
          loading={genLoading}
          result={genResult}
          error={genError}
          onRetry={handleRetry}
          onBack={handleBackFromResult}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  渲染：模板选择（第一步）                                            */
  /* ---------------------------------------------------------------- */
  if (!template) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        {/* 独立标题区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            你想创建什么类型的图片？
          </h1>
          <p className="text-base text-muted-foreground mt-2">
            选择一个模板开始，后续问题会根据模板自动调整
          </p>
        </div>

        {/* 模板卡片网格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTemplateSelect(t.id)}
              className="text-left p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
            >
              <div className="text-base font-semibold group-hover:text-primary transition-colors">
                {t.title}
              </div>
              <div className="text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {t.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  渲染：向导视图（带侧边摘要）                                        */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full max-w-4xl mx-auto flex gap-6">
      {/* 主面板 */}
      <div className="flex-1 min-w-0">

        {/* 当前问题 — 视觉焦点 */}
        {wizard.currentQuestion ? (
          <div>
            {/* 问题标题 */}
            <div className="px-1 mb-4">
              <h2 className="text-2xl font-bold tracking-tight mb-1">
                {wizard.currentQuestion.question}
              </h2>
              {wizard.currentQuestion.description && (
                <p className="text-sm text-muted-foreground">
                  {wizard.currentQuestion.description}
                </p>
              )}
            </div>

            {/* 步骤节点进度条 */}
            <div className="flex items-center gap-0 px-1 mb-5">
              {wizard.visibleQuestions.map((q, idx) => {
                const isCurrent = idx === wizard.state.step;
                const isCompleted = completedQuestionIds.includes(q.id);
                const nextQuestion = wizard.visibleQuestions[idx + 1];
                const nextIsCurrent = idx + 1 === wizard.state.step;
                const nextIsCompleted = nextQuestion
                  ? completedQuestionIds.includes(nextQuestion.id)
                  : false;
                const isCurrentAnswered = isCurrent && wizard.isQuestionAnswered(q);
                const isNextActive = nextIsCurrent
                  ? wizard.currentQuestion
                    ? wizard.isQuestionAnswered(wizard.currentQuestion)
                    : false
                  : nextIsCompleted;
                const isConnectorComplete = (isCompleted || isCurrentAnswered) && isNextActive;
                const isClickable = isCurrent || isCompleted;
                return (
                  <div key={q.id} className="flex items-center flex-1 last:flex-initial">
                    {/* 节点 */}
                    <button
                      type="button"
                      disabled={!isClickable && !isCurrent}
                      onClick={() => {
                        if (isClickable) wizard.goTo(idx);
                      }}
                      title={q.question}
                      className={`
                        relative flex-shrink-0 w-3 h-3 rounded-full border-2 transition-all duration-200
                        ${isCurrent
                          ? "border-[#FF6600] bg-[#FF6600] ring-4 ring-[#FF6600]/20 scale-125"
                          : isCompleted
                            ? "border-[#FF6600] bg-[#FF6600] cursor-pointer hover:scale-125"
                            : "border-muted-foreground/30 bg-background"
                        }
                        ${isClickable && !isCurrent ? "cursor-pointer" : ""}
                        ${!isClickable && !isCurrent ? "cursor-default" : ""}
                      `}
                    >
                      {isCompleted && !isCurrent && (
                        <svg className="absolute inset-0 w-full h-full text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    {/* 连接线 */}
                    {idx < wizard.visibleQuestions.length - 1 && (
                      <div className="flex-1 h-0.5 mx-0.5">
                        <div
                          className={`h-full rounded-full transition-colors duration-200 ${
                            isConnectorComplete ? "bg-[#FF6600]" : "bg-muted-foreground/20"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 选项列表 */}
            <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            <OptionList
              question={wizard.currentQuestion}
              selected={wizard.state.selections[wizard.currentQuestion.id]}
              customInput={wizard.state.customInputs[wizard.currentQuestion.id]}
              onSelectSingle={(optId) =>
                wizard.selectSingle(wizard.currentQuestion!.id, optId)
              }
              onToggleMulti={(optId) =>
                wizard.toggleMulti(wizard.currentQuestion!.id, optId)
              }
              onCustomInputChange={(value) =>
                wizard.setCustomInput(wizard.currentQuestion!.id, value)
              }
            />
            </div>

            {/* 底部操作栏：返回 + 确认 */}
            <div className="flex items-center justify-between px-1 mt-4">
              <button
                type="button"
                onClick={wizard.state.step > 0 ? wizard.prev : handleBackToTemplates}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {wizard.state.step > 0 ? "上一步" : "返回模板选择"}
              </button>
              {(() => {
                const hasAnswer = wizard.isQuestionAnswered(wizard.currentQuestion!);
                return hasAnswer ? (
                  <button
                    type="button"
                    onClick={wizard.next}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-[#FF6600] text-white shadow-md hover:bg-[#E55C00] transition-all duration-200"
                  >
                    下一步
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    下一步
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                );
              })()}
            </div>
          </div>
        ) : wizard.isComplete ? (
          /* 完成态：进度条 + 选项摘要 + 生成按钮（无侧边栏） */
          <div className="max-w-2xl mx-auto">
            {/* 顶部标题 */}
            <div className="px-1 mb-4">
              <h2 className="text-2xl font-bold tracking-tight">确认并生成</h2>
            </div>

            {/* 步骤节点进度条 — 全部完成 */}
            <div className="flex items-center gap-0 px-1 mb-6">
              {wizard.visibleQuestions.map((q, idx) => {
                const isCompleted = completedQuestionIds.includes(q.id);
                const nextQuestion = wizard.visibleQuestions[idx + 1];
                const nextIsCompleted = nextQuestion
                  ? completedQuestionIds.includes(nextQuestion.id)
                  : false;

                return (
                  <div key={q.id} className="flex items-center flex-1 last:flex-initial">
                    <button
                      type="button"
                      onClick={() => wizard.goTo(idx)}
                      title={q.question}
                      className={`relative flex-shrink-0 w-3 h-3 rounded-full border-2 transition-all duration-200 ${
                        isCompleted
                          ? "border-[#FF6600] bg-[#FF6600] cursor-pointer hover:scale-125"
                          : "border-muted-foreground/30 bg-background"
                      }`}
                    >
                      {isCompleted && (
                        <svg className="absolute inset-0 w-full h-full text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    {idx < wizard.visibleQuestions.length - 1 && (
                      <div className="flex-1 h-0.5 mx-0.5">
                        <div
                          className={`h-full rounded-full ${
                            isCompleted && nextIsCompleted ? "bg-[#FF6600]" : "bg-muted-foreground/20"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 选项摘要卡片 — 点击可跳回修改 */}
            <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden mb-6">
              {wizard.visibleQuestions.map((q, idx) => {
                const sel = wizard.state.selections[q.id];
                const customVal = wizard.state.customInputs[q.id];
                const labels: string[] = [];
                if (Array.isArray(sel)) {
                  sel.forEach((id) => {
                    const opt = q.options.find((o) => o.id === id);
                    if (opt) labels.push(opt.label);
                  });
                } else if (sel) {
                  const opt = q.options.find((o) => o.id === sel);
                  if (opt) labels.push(opt.label);
                }
                if (customVal) labels.push(customVal);

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => wizard.goTo(idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{q.question}</div>
                      <div className="text-sm font-medium truncate mt-0.5">
                        {labels.length > 0 ? labels.join("、") : <span className="text-muted-foreground">未选择</span>}
                      </div>
                    </div>
                    <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            {/* 生成按钮 */}
            <div className="flex justify-center">
              <div className="text-center">
                <div className="text-sm font-medium">
                  {priceEstimate.error
                    ? "预估消耗暂不可用"
                    : priceEstimate.loading
                    ? "正在计算预估消耗..."
                    : priceEstimate.estimate !== null
                      ? `预估消耗：${priceEstimate.estimate} 点`
                      : "预估消耗：请先完成生成参数选择"}
                </div>
                <div className="text-xs text-muted-foreground mt-1 mb-3">
                  最终扣费以后端实时结算为准
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-2 px-10 py-3 rounded-lg bg-[#FF6600] text-white font-semibold text-sm hover:bg-[#E55C00] transition-colors shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  生成图片
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 侧边摘要 + 操作指引（仅在向导步骤中显示） */}
      {wizard.currentQuestion && (
      <div className="hidden md:block w-72 flex-shrink-0 space-y-4">
        <SummaryPreview buildResult={wizard.buildResult} />

        {/* 操作指引 */}
        <div className="border border-border rounded-lg bg-card shadow-sm p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">操作指引</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-1.5">
              <MousePointerClick className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#FF6600]" />
              <span>使用<strong className="text-foreground">鼠标点击</strong>选项进行选择</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Keyboard className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#FF6600]" />
              <span><strong className="text-foreground">空格</strong>确认下一步，输入框聚焦时请直接点击下一步</span>
            </li>
            <li className="flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#FF6600]" />
              <span>点击<strong className="text-foreground">进度条节点</strong>可跳转到任意已完成的步骤</span>
            </li>
          </ul>
        </div>
      </div>
      )}
    </div>
  );
}
