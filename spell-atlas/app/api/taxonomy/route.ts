import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { ensureDefaultRunesSeeded } from '@/lib/db/naming';
import { getTaxonomy } from '@/lib/db/taxonomy';

export async function GET() {
  const db = getDb();
  ensureDefaultRunesSeeded(db);
  return NextResponse.json(getTaxonomy(db));
}
