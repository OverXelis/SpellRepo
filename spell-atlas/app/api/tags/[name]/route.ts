import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { removeTag, renameTag, setTagCategory } from '@/lib/db/tags';
import { withErrorHandling } from '@/lib/api-utils';

export const PATCH = withErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params;
  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const decodedName = decodeURIComponent(name);

  if (typeof body.newName === 'string' && body.newName.trim()) {
    renameTag(db, decodedName, body.newName);
  }
  if (body.category !== undefined) {
    setTagCategory(db, typeof body.newName === 'string' ? body.newName.trim() : decodedName, body.category);
  }

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: { params: Promise<{ name: string }> }) => {
  const { name } = await params;
  const db = getDb();
  removeTag(db, decodeURIComponent(name));
  return NextResponse.json({ success: true });
});
