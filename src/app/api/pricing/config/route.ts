import { NextResponse } from "next/server";
import type { PricingConfigResponse } from "@/lib/types";

const MODEL_BASE_PRICES: Record<string, number> = {
  "nano-banana": 10,
};

export async function GET() {
  const response: PricingConfigResponse = {
    ok: true,
    config: {
      model_base_prices: MODEL_BASE_PRICES,
      currency: "credits",
      formula: "model_base_price * image_count_factor",
      updated_at: "2026-03-10",
    },
  };

  return NextResponse.json(response);
}
