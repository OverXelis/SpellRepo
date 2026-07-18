import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getAllTags } from '@/lib/db/tags';
import { estimateEnrichmentCost } from '@/lib/ai/pricing';
import { withErrorHandling } from '@/lib/api-utils';

const MODEL = process.env.ANTHROPIC_BATCH_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const spellCount = Number(params.get('spellCount') ?? '0');
  const batchSize = Number(params.get('batchSize') ?? '10');

  const db = getDb();
  const tagCount = getAllTags(db).length;

  const estimate = estimateEnrichmentCost(spellCount, batchSize, tagCount, MODEL);
  return NextResponse.json(estimate);
});
