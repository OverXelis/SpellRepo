import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { addTag, getAllTags } from '@/lib/db/tags';

export async function GET() {
  const db = getDb();
  return NextResponse.json(getAllTags(db));
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  addTag(db, name, body.category ?? null);
  return NextResponse.json({ success: true });
}
