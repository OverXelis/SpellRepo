// Rough, deliberately-conservative cost estimation for the batch
// description generator. This is a UI convenience (so the author can see
// roughly what a run will cost before starting it), not a billing system --
// actual usage is whatever Anthropic reports on your account.

export interface ModelPricing {
  inputPerMTok: number;
  outputPerMTok: number;
}

// Prices in USD per million tokens. Deliberately using the *standard*
// (post-introductory-period) rate for Sonnet rather than any temporary
// promotional price, so this estimate doesn't quietly become an
// underestimate later.
export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-5': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
};

const DEFAULT_PRICING: ModelPricing = MODEL_PRICING['claude-sonnet-5'];

export function getPricingForModel(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

// Rough per-spell token budgets, deliberately rounded up a bit so the
// estimate errs on the conservative (higher) side.
const SYSTEM_PROMPT_TOKENS = 600;
const PER_BATCH_INSTRUCTION_TOKENS = 150;
const PER_SPELL_INPUT_TOKENS = 50;
const PER_SPELL_OUTPUT_TOKENS = 90;
const PER_TAG_TOKENS = 4;

export interface CostEstimate {
  model: string;
  spellCount: number;
  batchCount: number;
  estInputTokens: number;
  estOutputTokens: number;
  estCostUsd: number;
}

/**
 * Estimates cost ignoring the savings from prompt caching (the system
 * prompt is identical across every batch in a run and is sent with a cache
 * breakpoint -- see lib/ai/batch-generate.ts) -- so real cost on batches
 * after the first is typically somewhat *lower* than this estimate, not
 * higher.
 */
export function estimateEnrichmentCost(
  spellCount: number,
  batchSize: number,
  tagCount: number,
  model: string
): CostEstimate {
  const pricing = getPricingForModel(model);
  const batchCount = Math.max(1, Math.ceil(spellCount / Math.max(1, batchSize)));

  const perBatchFixedTokens = SYSTEM_PROMPT_TOKENS + PER_BATCH_INSTRUCTION_TOKENS + tagCount * PER_TAG_TOKENS;
  const estInputTokens = batchCount * perBatchFixedTokens + spellCount * PER_SPELL_INPUT_TOKENS;
  const estOutputTokens = spellCount * PER_SPELL_OUTPUT_TOKENS;

  const estCostUsd = (estInputTokens / 1_000_000) * pricing.inputPerMTok + (estOutputTokens / 1_000_000) * pricing.outputPerMTok;

  return { model, spellCount, batchCount, estInputTokens, estOutputTokens, estCostUsd };
}
