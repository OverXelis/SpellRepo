import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { deleteSpell, getSpellById, updateSpell, type SpellPatch } from '@/lib/db/spells';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const db = getDb();
  const spell = getSpellById(db, id);
  if (!spell) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(spell);
});

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const db = getDb();
  const body = (await request.json().catch(() => ({}))) as SpellPatch;
  const spell = updateSpell(db, id, body);
  if (!spell) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(spell);
});

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const db = getDb();
  deleteSpell(db, id);
  return NextResponse.json({ success: true });
});
