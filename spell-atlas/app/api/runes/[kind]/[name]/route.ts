import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { removeRune, renameRune, updateDisplayName } from '@/lib/db/runes';
import type { RuneKind } from '@/lib/core/types';

function isRuneKind(value: string): value is RuneKind {
  return ['circleBase', 'primary', 'modifier', 'control'].includes(value);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name } = await params;
  if (!isRuneKind(kind)) return NextResponse.json({ error: 'Invalid rune kind' }, { status: 400 });

  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const decodedName = decodeURIComponent(name);

  if (typeof body.newName === 'string' && body.newName.trim()) {
    renameRune(db, kind, decodedName, body.newName);
  }
  if (typeof body.displayName === 'string') {
    updateDisplayName(db, kind, typeof body.newName === 'string' ? body.newName.trim() : decodedName, body.displayName);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name } = await params;
  if (!isRuneKind(kind)) return NextResponse.json({ error: 'Invalid rune kind' }, { status: 400 });

  const db = getDb();
  const result = removeRune(db, kind, decodeURIComponent(name));
  return NextResponse.json(result);
}
