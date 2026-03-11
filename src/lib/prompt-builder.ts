import { sharedGenerationQuestions } from "@/data/shared-generation-questions";
import type {
  CustomInputs,
  PricingMeta,
  PromptBuildResult,
  PromptMeta,
  Selections,
  SummaryItem,
  Template,
  TemplateQuestion,
} from "./types";

const FIXED_MODEL_OPTION_ID = "nano_banana";
const FIXED_BACKEND_MODEL_ID = "nano-banana";
const FIXED_PRICING_FORMULA = "model_base_price * image_count_factor";

function isQuestionVisible(question: TemplateQuestion, selections: Selections): boolean {
  if (!question.condition) {
    return true;
  }

  const { question_id, equals_option_id } = question.condition;
  const selection = selections[question_id];
  return selection === equals_option_id;
}

/**
 * Build prompt, summary and generation params from user selections.
 */
export function buildPrompt(
  template: Template,
  selections: Selections,
  customInputs: CustomInputs = {},
): PromptBuildResult {
  const summaryParts: string[] = [];
  const summaryItems: SummaryItem[] = [];
  const generationParamItems: SummaryItem[] = [];
  const promptItems: SummaryItem[] = [];
  const meta: PromptMeta = {
    template_id: template.id,
    model: FIXED_MODEL_OPTION_ID,
    backend_model_id: FIXED_BACKEND_MODEL_ID,
  };
  const pricingMeta: PricingMeta = {
    formula: FIXED_PRICING_FORMULA,
    model_option_id: FIXED_MODEL_OPTION_ID,
    backend_model_id: FIXED_BACKEND_MODEL_ID,
  };

  const visibleQuestions = getVisibleQuestions(template, selections);

  for (const question of visibleQuestions) {
    const selection = selections[question.id];
    const customText = (customInputs[question.id] ?? "").trim();

    const labels: string[] = [];

    if (question.type === "single" && typeof selection === "string") {
      const option = question.options.find((item) => item.id === selection);
      if (option) {
        labels.push(option.label);

        if (question.question_kind === "generation_param") {
          if (question.id === "image_count") {
            const parsedCount = Number.parseInt(option.id, 10);
            const imageCount = Number.isFinite(parsedCount) ? parsedCount : 1;
            meta.image_count = imageCount;
            pricingMeta.image_count_option_id = option.id;
            pricingMeta.image_count_factor =
              typeof option.billing_factor === "number" ? option.billing_factor : imageCount;
          } else {
            meta[question.id] = option.id;
          }
        }
      }
    }

    if (question.type === "multi" && Array.isArray(selection)) {
      for (const optionId of selection) {
        const option = question.options.find((item) => item.id === optionId);
        if (!option) {
          continue;
        }
        labels.push(option.label);
      }

      if (question.question_kind === "generation_param" && selection.length > 0) {
        meta[question.id] = selection;
      }
    }

    let answer = labels.join("、");

    if (question.question_kind === "prompt_input" && customText) {
      if (answer) {
        answer = `${answer}（补充：${customText}）`;
      } else {
        answer = customText;
      }
    }

    if (answer) {
      const item: SummaryItem = {
        question: question.question,
        answer,
      };
      summaryItems.push(item);
      summaryParts.push(`${question.question}：${answer}`);

      if (question.question_kind === "prompt_input") {
        promptItems.push(item);
      } else {
        generationParamItems.push(item);
      }
    }
  }

  const promptSections = [`请生成一张${template.title}。`, template.description];
  if (promptItems.length > 0) {
    promptSections.push("请根据以下内容完成画面：");
    promptSections.push(
      promptItems
        .map((item, index) => `${index + 1}. ${item.question}：${item.answer}`)
        .join("\n"),
    );
  }

  const prompt = promptSections.filter(Boolean).join("\n");
  const summary_cn = summaryParts.length > 0 ? summaryParts.join(" | ") : "尚未选择任何选项";

  if (meta.image_count === undefined) {
    meta.image_count = 1;
    pricingMeta.image_count_option_id = "1";
    pricingMeta.image_count_factor = 1;
  }

  meta.pricing = pricingMeta;

  return {
    prompt,
    summary_cn,
    summaryItems,
    generationParamItems,
    meta,
  };
}

/**
 * Return visible question list in the final order:
 * template content questions first, then shared generation params.
 */
export function getVisibleQuestions(
  template: Template,
  selections: Selections,
): TemplateQuestion[] {
  const contentQuestions: TemplateQuestion[] = [];
  const visibleQuestionIds = new Set<string>();

  for (const question of template.questions) {
    if (!question.condition) {
      contentQuestions.push(question);
      visibleQuestionIds.add(question.id);
      continue;
    }

    const { question_id, equals_option_id } = question.condition;
    const conditionQuestionIsVisible = visibleQuestionIds.has(question_id);
    const selection = selections[question_id];
    if (conditionQuestionIsVisible && selection === equals_option_id) {
      contentQuestions.push(question);
      visibleQuestionIds.add(question.id);
    }
  }

  const generationQuestions = sharedGenerationQuestions.filter((question) => {
    if (!question.condition) {
      return true;
    }

    return isQuestionVisible(question, selections);
  });

  return [...contentQuestions, ...generationQuestions];
}
