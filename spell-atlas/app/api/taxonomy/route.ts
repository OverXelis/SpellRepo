import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { ensureDefaultRunesSeeded } from '@/lib/db/naming';
import { getTaxonomy } from '@/lib/db/taxonomy';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const db = getDb();
  ensureDefaultRunesSeeded(db);
  return NextResponse.json(getTaxonomy(db));
});
