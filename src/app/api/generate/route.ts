import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { GenerateRequest, GenerateResponse } from "@/lib/types";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "https://xingjiabiapi.org";
const DEFAULT_MODEL_ID = "gemini-2.5-flash-image";
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_ASPECT_RATIO = "1:1";
const MIN_IMAGE_COUNT = 1;
const MAX_IMAGE_COUNT = 4;

const SUPPORTED_ASPECT_RATIOS = new Set([
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
  "21:9",
]);

type ProviderErrorInfo = {
  httpStatus?: number;
  reason?: string;
  status?: string;
  message?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeAspectRatio(value: unknown): string {
  const ratio = typeof value === "string" ? value.trim() : "";
  if (!ratio || !SUPPORTED_ASPECT_RATIOS.has(ratio)) {
    return DEFAULT_ASPECT_RATIO;
  }
  return ratio;
}

function normalizeImageCount(value: unknown): number {
  const parsed =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value ?? MIN_IMAGE_COUNT), 10);
  if (!Number.isFinite(parsed)) {
    return MIN_IMAGE_COUNT;
  }
  return clamp(Math.round(parsed), MIN_IMAGE_COUNT, MAX_IMAGE_COUNT);
}

function normalizeTimeout(value: string | undefined): number {
  const parsed = Number.parseInt(String(value ?? DEFAULT_TIMEOUT_MS), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
}

function safeParseJson<T = unknown>(input: unknown): T | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(input) as T;
  } catch {
    return undefined;
  }
}

function parseGoogleCompatibleError(error: unknown): ProviderErrorInfo {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const first = safeParseJson<{ error?: { code?: number; message?: string; status?: string } }>(
    error.message,
  );
  if (first?.error) {
    const nestedMessage =
      typeof first.error.message === "string" ? first.error.message : undefined;
    const second = nestedMessage
      ? safeParseJson<{
          error?: {
            code?: number;
            status?: string;
            message?: string;
            details?: Array<{ reason?: string; domain?: string }>;
          };
        }>(nestedMessage)
      : undefined;

    const googleError = second?.error;
    const reason = Array.isArray(googleError?.details)
      ? googleError?.details.find((item) => item?.reason)?.reason
      : undefined;

    return {
      httpStatus:
        (typeof first.error.code === "number" ? first.error.code : undefined) ||
        (typeof googleError?.code === "number" ? googleError.code : undefined),
      status:
        (typeof googleError?.status === "string" ? googleError.status : undefined) ||
        (typeof first.error.status === "string" ? first.error.status : undefined),
      reason: typeof reason === "string" ? reason : undefined,
      message:
        (typeof googleError?.message === "string" ? googleError.message : undefined) ||
        (typeof first.error.message === "string" ? first.error.message : undefined) ||
        error.message,
    };
  }

  const fallbackStatus = (error as { status?: unknown; code?: unknown }).status;
  const fallbackCode = (error as { code?: unknown }).code;

  return {
    httpStatus:
      typeof fallbackStatus === "number"
        ? fallbackStatus
        : typeof fallbackCode === "number"
          ? fallbackCode
          : undefined,
    message: error.message,
  };
}

function toUserErrorMessage(info: ProviderErrorInfo): string {
  const message = (info.message || "Unknown provider error").trim();
  const upperStatus = (info.status || "").toUpperCase();
  const lowerMessage = message.toLowerCase();
  if (message.includes("SAFETY")) {
    return `内容触发安全策略，请调整描述后重试。(${message})`;
  }

  if (
    upperStatus === "DEADLINE_EXCEEDED" ||
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("aborted")
  ) {
    return `上游请求超时，请稍后重试。(${message})`;
  }

  if (info.httpStatus === 400) {
    return `上游参数校验失败，请检查 prompt 与参数。(${message})`;
  }

  if (info.httpStatus === 401 || info.httpStatus === 403) {
    return `上游鉴权失败，请检查 XINGJIABI_API_KEY。(${message})`;
  }

  if (info.httpStatus === 404) {
    return `上游模型不存在，请检查 XINGJIABI_MODEL_ID。(${message})`;
  }

  if (info.httpStatus === 429 || info.status?.toUpperCase() === "RESOURCE_EXHAUSTED") {
    return `上游请求过于频繁，请稍后重试。(${message})`;
  }

  if (info.httpStatus === 500 || info.httpStatus === 503) {
    return `上游服务暂不可用，请稍后重试。(${message})`;
  }

  return `生成失败：${message}`;
}

function extractRegularImage(response: unknown): string {
  const parts = ((response as { candidates?: Array<{ content?: { parts?: unknown[] } }> })
    ?.candidates?.[0]?.content?.parts ?? []) as Array<{
    thought?: unknown;
    inlineData?: { data?: string; mimeType?: string };
  }>;

  for (const part of parts) {
    const isThoughtPart = Boolean(part?.thought);
    const data = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;
    if (isThoughtPart) {
      continue;
    }
    if (
      typeof data === "string" &&
      data.length > 0 &&
      typeof mimeType === "string" &&
      mimeType.length > 0
    ) {
      return `data:${mimeType};base64,${data}`;
    }
  }

  throw new Error("No image generated with provider response");
}

async function generateSingleImage(
  ai: GoogleGenAI,
  modelId: string,
  prompt: string,
  aspectRatio: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ text: prompt }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio,
      },
    },
  });

  return extractRegularImage(response);
}

/**
 * POST /api/generate
 * Real generation endpoint powered by xingjiabi Google-compatible API.
 */
export async function POST(req: NextRequest) {
  let body: GenerateRequest | null = null;

  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        images: [],
        request_id: crypto.randomUUID(),
        used_prompt: "",
        used_meta: {},
        error: "请求格式错误",
      } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      {
        ok: false,
        images: [],
        request_id: crypto.randomUUID(),
        used_prompt: body.prompt ?? "",
        used_meta: body.meta ?? {},
        error: "prompt 不能为空",
      } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  const apiKey = (process.env.XINGJIABI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        images: [],
        request_id: crypto.randomUUID(),
        used_prompt: body.prompt,
        used_meta: body.meta,
        error: "服务端未配置 XINGJIABI_API_KEY",
      } satisfies GenerateResponse,
      { status: 500 },
    );
  }

  const baseUrl = (process.env.XINGJIABI_BASE_URL || DEFAULT_BASE_URL).trim();
  const modelId = (process.env.XINGJIABI_MODEL_ID || DEFAULT_MODEL_ID).trim();
  const timeoutMs = normalizeTimeout(process.env.XINGJIABI_TIMEOUT_MS);
  const aspectRatio = normalizeAspectRatio(body.meta?.ratio);
  const imageCount = normalizeImageCount(body.meta?.image_count);

  const ai = new GoogleGenAI({
    apiKey,
    vertexai: false,
    httpOptions: {
      timeout: timeoutMs,
      baseUrl,
    },
  });

  try {
    const images: string[] = [];

    // Keep serial generation to reduce provider-side throttling in demo mode.
    for (let i = 0; i < imageCount; i += 1) {
      const image = await generateSingleImage(ai, modelId, prompt, aspectRatio);
      images.push(image);
    }

    return NextResponse.json({
      ok: true,
      images,
      request_id: crypto.randomUUID(),
      used_prompt: body.prompt,
      used_meta: {
        ...body.meta,
        ratio: aspectRatio,
        image_count: imageCount,
      },
    } satisfies GenerateResponse);
  } catch (error) {
    const info = parseGoogleCompatibleError(error);
    const status =
      typeof info.httpStatus === "number" && info.httpStatus >= 400 && info.httpStatus < 600
        ? info.httpStatus
        : 500;

    return NextResponse.json(
      {
        ok: false,
        images: [],
        request_id: crypto.randomUUID(),
        used_prompt: body.prompt,
        used_meta: {
          ...body.meta,
          ratio: aspectRatio,
          image_count: imageCount,
        },
        error: toUserErrorMessage(info),
      } satisfies GenerateResponse,
      { status },
    );
  }
}
