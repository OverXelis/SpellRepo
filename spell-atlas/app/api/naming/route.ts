import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getRuneNameConfig } from '@/lib/db/naming';
import { updateDisplayName } from '@/lib/db/runes';
import type { RuneKind } from '@/lib/core/types';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const db = getDb();
  return NextResponse.json(getRuneNameConfig(db));
});

/** Bulk-updates display names in one call, e.g. from the naming config UI. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const updates = (body.updates ?? []) as { kind: RuneKind; name: string; displayName: string }[];
  for (const update of updates) {
    updateDisplayName(db, update.kind, update.name, update.displayName);
  }
  return NextResponse.json({ success: true });
});
