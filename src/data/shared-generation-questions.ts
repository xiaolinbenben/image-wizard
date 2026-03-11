import type { TemplateQuestion } from "@/lib/types";

export const sharedGenerationQuestions: TemplateQuestion[] = [
  {
    id: "ratio",
    question: "你希望图片使用哪种宽高比？",
    description: "选择生成图片的画面比例",
    question_kind: "generation_param",
    type: "single",
    options: [
      { id: "1:1", label: "1:1 方形" },
      { id: "16:9", label: "16:9 横版" },
      { id: "9:16", label: "9:16 竖版" },
      { id: "4:3", label: "4:3" },
      { id: "3:4", label: "3:4" },
      { id: "3:2", label: "3:2" },
      { id: "2:3", label: "2:3" },
      { id: "21:9", label: "21:9 超宽" },
    ],
  },
  {
    id: "image_count",
    question: "生成数量",
    description: "一次返回的图片数量",
    question_kind: "generation_param",
    type: "single",
    options: [
      { id: "1", label: "1 张", billing_factor: 1 },
      { id: "2", label: "2 张", billing_factor: 2 },
      { id: "3", label: "3 张", billing_factor: 3 },
      { id: "4", label: "4 张", billing_factor: 4 },
    ],
  },
];
