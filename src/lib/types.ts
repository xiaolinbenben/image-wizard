/* ------------------------------------------------------------------ */
/*  Image Wizard types                                                  */
/* ------------------------------------------------------------------ */

export type QuestionKind = "prompt_input" | "generation_param";

/** Single option */
export interface TemplateOption {
  id: string;
  label: string;
  description?: string;
  tags?: string[];
  preview?: string;
  backend_model_id?: string;
  billing_variant_key?: string;
  billing_factor?: number;
}

/** Conditional display rule */
export interface QuestionCondition {
  question_id: string;
  equals_option_id: string;
}

/** Single question */
export interface TemplateQuestion {
  id: string;
  question: string;
  description?: string;
  question_kind: QuestionKind;
  type: "single" | "multi";
  options: TemplateOption[];
  condition?: QuestionCondition;
  custom_input_placeholder?: string;
}

/** Template schema */
export interface Template {
  id: string;
  title: string;
  description: string;
  base_prompt: string;
  output_constraint?: string;
  questions: TemplateQuestion[];
}

/* ------------------------------------------------------------------ */
/*  Runtime state                                                       */
/* ------------------------------------------------------------------ */

export type Selections = Record<string, string | string[]>;
export type CustomInputs = Record<string, string>;

export interface SummaryItem {
  question: string;
  answer: string;
}

export interface PricingMeta {
  model_option_id?: string;
  backend_model_id?: string;
  image_count_option_id?: string;
  image_count_factor?: number;
  formula?: string;
}

export interface PromptMeta {
  template_id?: string;
  ratio?: string;
  model?: string;
  backend_model_id?: string;
  image_count?: number;
  pricing?: PricingMeta;
  [key: string]: unknown;
}

export interface PromptBuildResult {
  prompt: string;
  summary_cn: string;
  summaryItems: SummaryItem[];
  generationParamItems: SummaryItem[];
  meta: PromptMeta;
}

export interface GenerateRequest {
  template_id: string;
  selections: Selections;
  custom_inputs?: CustomInputs;
  prompt: string;
  meta: PromptMeta;
}

export interface GenerateResponse {
  ok: boolean;
  images: string[];
  request_id: string;
  used_prompt: string;
  used_meta: PromptMeta;
  error?: string;
}

export interface PricingConfig {
  model_base_prices: Record<string, number>;
  currency: "credits";
  formula: string;
  updated_at: string;
}

export interface PricingConfigResponse {
  ok: boolean;
  config?: PricingConfig;
  error?: string;
}
