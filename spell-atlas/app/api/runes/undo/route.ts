import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { undoLastBatch } from '@/lib/db/runes';
import { withErrorHandling } from '@/lib/api-utils';

export const POST = withErrorHandling(async () => {
  const db = getDb();
  const undone = undoLastBatch(db);
  if (!undone) return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 });
  return NextResponse.json(undone);
});
