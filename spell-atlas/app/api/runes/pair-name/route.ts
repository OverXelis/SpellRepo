import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { updateModifierPairName } from '@/lib/db/runes';

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const { mod1, mod2, displayName } = body as { mod1?: string; mod2?: string; displayName?: string };
  if (!mod1 || !mod2) {
    return NextResponse.json({ error: 'mod1 and mod2 are required' }, { status: 400 });
  }
  updateModifierPairName(db, mod1, mod2, displayName ?? '');
  return NextResponse.json({ success: true });
}
