# image-wizard
无需任何提示词，点点点完成模型选择、参数配置与风格设定，系统自动生成图片。

# Image Wizard Demo（向导式生图）

> 通过问答向导生成 prompt，并调用 `xingjiabiapi`（Google 兼容）实时生图。

## 快速启动

```bash
cd demo/image-wizard
npm install
npm run dev
```

打开 <http://localhost:3099/wizard>

## 环境变量

本地开发可在 `demo/image-wizard/.env.local` 配置：

```env
XINGJIABI_API_KEY=your_key
XINGJIABI_BASE_URL=https://xingjiabiapi.org
XINGJIABI_MODEL_ID=gemini-2.5-flash-image
XINGJIABI_TIMEOUT_MS=120000
```

说明：
- `XINGJIABI_API_KEY` 必填。
- `XINGJIABI_BASE_URL`、`XINGJIABI_MODEL_ID`、`XINGJIABI_TIMEOUT_MS` 可选，未配置时使用默认值。

## 目录（关键部分）

```text
demo/image-wizard/
├─ src/
│  ├─ app/api/generate/route.ts             # 实际生图接口（xingjiabi）
│  ├─ app/api/pricing/config/route.ts       # 前端估价配置
│  ├─ data/templates/*.json                 # 模板题目
│  ├─ data/shared-generation-questions.ts   # 固定生成参数题（ratio + image_count）
│  ├─ lib/prompt-builder.ts                 # prompt/meta 构建
│  └─ hooks/use-price-estimate.ts           # 估价计算
├─ scripts/validate-templates.mjs           # 模板校验脚本
└─ deploy/                                   # 独立部署配置
```

## 题目体系说明

- 业务题（模板内）：`question_kind = "prompt_input"`
- 生成参数题（固定追加）：`question_kind = "generation_param"`
- 当前 demo 固定模型：`nano-banana`
- 当前 demo 仅保留两项生成参数：
  - `ratio`
  - `image_count`

条件追问规则：
- 使用 `condition` 定义，仅支持“前置单选题 == 某 option_id”。
- 父题必须在子题之前。
- 父题必须是 `single`。

## Prompt 与 Meta

`prompt-builder` 会输出：
- `prompt`：给模型的最终描述
- `summary_cn`：前端摘要
- `meta`：结构化参数

demo 固定输出的关键 meta：

```json
{
  "model": "nano_banana",
  "backend_model_id": "nano-banana",
  "ratio": "1:1",
  "image_count": 2,
  "pricing": {
    "formula": "model_base_price * image_count_factor",
    "model_option_id": "nano_banana",
    "backend_model_id": "nano-banana",
    "image_count_option_id": "2",
    "image_count_factor": 2
  }
}
```

## 生图接口

### `POST /api/generate`

请求：

```json
{
  "template_id": "ecommerce_poster",
  "selections": {},
  "custom_inputs": {},
  "prompt": "...",
  "meta": {
    "ratio": "1:1",
    "image_count": 2
  }
}
```

响应：

```json
{
  "ok": true,
  "images": ["data:image/png;base64,..."],
  "request_id": "uuid",
  "used_prompt": "...",
  "used_meta": {}
}
```

实现说明：
- 严格参考主应用调用链：`@google/genai + baseUrl`。
- 请求结构对齐主应用：`contents + config.responseModalities=["TEXT","IMAGE"] + imageConfig.aspectRatio`。
- 响应解析对齐主应用：仅提取非 thought 的 `inlineData` 图片；无图片即报错。
- 多图为串行调用后聚合返回（demo 简化方案）。

## 估价接口

### `GET /api/pricing/config`

返回固定模型估价配置，前端公式：

`model_base_price * image_count_factor`

## 模板校验

```bash
cd demo/image-wizard
npm run validate:templates
```

校验内容：
- 模板字段合法性
- `question_id / option_id` 唯一性
- 条件追问依赖合法性（父题存在、顺序正确、无循环）

## 相关文档

- 题目设计规范（AI 可读）：`docs/wiki/Runbooks/image-wizard-question-design-v2.md`
- 独立部署说明：`demo/image-wizard/deploy/README.md`
