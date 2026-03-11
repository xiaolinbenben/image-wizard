import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/schema/generate
 * 占位接口 — 未来可接入 AI 自动生成 template schema
 * 当前仅返回一个 stub 说明
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  return NextResponse.json({
    ok: false,
    message:
      "此接口为扩展占位，未来将接入 AI 自动生成 template schema。当前请手动编写 JSON 模板。",
    hint: "参考 src/data/template-schema.v2.json 与 src/data/templates/ 下的模板进行编写",
    received: body,
  });
}
