import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { addTag, getAllTags } from '@/lib/db/tags';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const db = getDb();
  return NextResponse.json(getAllTags(db));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  addTag(db, name, body.category ?? null);
  return NextResponse.json({ success: true });
});
