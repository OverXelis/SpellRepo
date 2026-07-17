import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { getRuneLists } from '@/lib/db/naming';
import { addRune } from '@/lib/db/runes';
import type { RuneKind } from '@/lib/core/types';

export async function GET() {
  const db = getDb();
  return NextResponse.json(getRuneLists(db));
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const kind = body.kind as RuneKind;
  const name = String(body.name ?? '');

  if (!['circleBase', 'primary', 'modifier', 'control'].includes(kind) || !name.trim()) {
    return NextResponse.json({ error: 'kind and name are required' }, { status: 400 });
  }

  if ((kind === 'modifier' || kind === 'control')) {
    const lists = getRuneLists(db);
    if (lists.primaryRunes.length === 0) {
      return NextResponse.json({ error: 'Add a primary rune before adding modifier/control runes' }, { status: 400 });
    }
  }

  const result = addRune(db, kind, name);
  return NextResponse.json(result);
}
