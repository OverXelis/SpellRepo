import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import {
  bulkMarkSpellsAsDuds,
  previewBulkMarkDuds,
  type DudMarkReason,
  type DudRuleFilters,
} from '@/lib/db/spells';
import { withErrorHandling } from '@/lib/api-utils';

function parseBody(body: Record<string, unknown>): { filters: DudRuleFilters; reason: DudMarkReason; dryRun: boolean } {
  const filters: DudRuleFilters = {};

  if (typeof body.circleBase === 'string' && body.circleBase.trim()) {
    filters.circleBase = body.circleBase.trim();
  }
  if (typeof body.primaryRune === 'string' && body.primaryRune.trim()) {
    filters.primaryRune = body.primaryRune.trim();
  }
  if (Array.isArray(body.modifierRunes)) {
    const mods = body.modifierRunes
      .filter((m): m is string => typeof m === 'string')
      .map((m) => m.trim())
      .filter(Boolean);
    if (mods.length > 0) filters.modifierRunes = mods.slice(0, 2);
  }
  if (body.controlRune === 'none' || body.controlRune === null) {
    filters.controlRune = 'none';
  } else if (typeof body.controlRune === 'string' && body.controlRune.trim()) {
    filters.controlRune = body.controlRune.trim();
  }

  const reason = body.reason === 'no_functional_use' ? 'no_functional_use' : 'fails_to_cast';
  const dryRun = Boolean(body.dryRun);

  return { filters, reason, dryRun };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { filters, reason, dryRun } = parseBody(body);
  const db = getDb();

  if (dryRun) {
    const preview = previewBulkMarkDuds(db, filters, reason);
    return NextResponse.json({ ...preview, dryRun: true });
  }

  const result = bulkMarkSpellsAsDuds(db, filters, reason);
  return NextResponse.json({ ...result, dryRun: false });
});
