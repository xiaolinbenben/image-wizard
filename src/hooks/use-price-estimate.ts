"use client";

import { useEffect, useMemo, useState } from "react";
import type { PricingConfig, PricingConfigResponse, PromptMeta } from "@/lib/types";

interface EstimateBreakdown {
  backendModelId: string;
  basePrice: number;
  imageCountFactor: number;
  formula: string;
}

interface UsePriceEstimateResult {
  loading: boolean;
  error: string | null;
  estimate: number | null;
  breakdown: EstimateBreakdown | null;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function usePriceEstimate(meta: PromptMeta): UsePriceEstimateResult {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/pricing/config", { cache: "no-store" });
        const payload: PricingConfigResponse = await response.json();

        if (!response.ok || !payload.ok || !payload.config) {
          throw new Error(payload.error ?? "价格配置加载失败");
        }

        if (!cancelled) {
          setConfig(payload.config);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "价格配置加载失败");
          setConfig(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const pricingMeta = meta.pricing;
    const backendModelId =
      typeof pricingMeta?.backend_model_id === "string" ? pricingMeta.backend_model_id : "";

    if (!config || !backendModelId) {
      return {
        loading,
        error,
        estimate: null,
        breakdown: null,
      };
    }

    const basePriceRaw = config.model_base_prices[backendModelId];
    if (!Number.isFinite(basePriceRaw) || basePriceRaw <= 0) {
      return {
        loading,
        error,
        estimate: null,
        breakdown: null,
      };
    }

    const basePrice = Number(basePriceRaw);
    const imageCountFromMeta =
      typeof meta.image_count === "number" && Number.isFinite(meta.image_count) && meta.image_count > 0
        ? meta.image_count
        : 1;
    const imageCountFactor = normalizePositiveNumber(
      pricingMeta?.image_count_factor,
      imageCountFromMeta,
    );

    const rawEstimate = basePrice * imageCountFactor;
    const estimate = Math.max(1, Math.round(rawEstimate));

    return {
      loading,
      error,
      estimate,
      breakdown: {
        backendModelId,
        basePrice,
        imageCountFactor,
        formula: config.formula,
      },
    };
  }, [config, error, loading, meta]);
}
