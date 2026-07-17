import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { undoLastBatch } from '@/lib/db/runes';

export async function POST() {
  const db = getDb();
  const undone = undoLastBatch(db);
  if (!undone) return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 });
  return NextResponse.json(undone);
}
