import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { countAffectedSpells, removeRune, renameRune, updateDisplayName, updateRuneMeaning } from '@/lib/db/runes';
import type { RuneKind } from '@/lib/core/types';
import { withErrorHandling } from '@/lib/api-utils';

function isRuneKind(value: string): value is RuneKind {
  return ['circleBase', 'primary', 'modifier', 'control'].includes(value);
}

/** Preview endpoint: how many spells would be deleted if this rune (or
 * circle base) were removed, without actually removing anything. Used by
 * the Builder UI to show a real count in the delete confirmation. */
export const GET = withErrorHandling(async (_request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) => {
  const { kind, name } = await params;
  if (!isRuneKind(kind)) return NextResponse.json({ error: 'Invalid rune kind' }, { status: 400 });

  const db = getDb();
  const affectedSpellCount = countAffectedSpells(db, kind, decodeURIComponent(name));
  return NextResponse.json({ affectedSpellCount });
});

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) => {
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
  if (typeof body.meaning === 'string') {
    updateRuneMeaning(db, kind, typeof body.newName === 'string' ? body.newName.trim() : decodedName, body.meaning);
  }

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: { params: Promise<{ kind: string; name: string }> }) => {
  const { kind, name } = await params;
  if (!isRuneKind(kind)) return NextResponse.json({ error: 'Invalid rune kind' }, { status: 400 });

  const db = getDb();
  const result = removeRune(db, kind, decodeURIComponent(name));
  return NextResponse.json(result);
});
