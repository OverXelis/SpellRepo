import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { importAll } from '@/lib/db/export-import';

export async function POST(request: NextRequest) {
  const db = getDb();
  const text = await request.text();
  const result = importAll(db, text);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Import failed' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
