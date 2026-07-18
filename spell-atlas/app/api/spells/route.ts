import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { searchSpells, type SearchFilters } from '@/lib/db/spells';
import type { SpellStatus } from '@/lib/core/types';
import { withErrorHandling } from '@/lib/api-utils';

function parseFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};
  const query = params.get('query');
  if (query) filters.query = query;

  const tags = params.get('tags');
  if (tags) filters.tags = tags.split(',').filter(Boolean);
  const tagMode = params.get('tagMode');
  if (tagMode === 'any' || tagMode === 'all') filters.tagMode = tagMode;

  const circleBase = params.get('circleBase');
  if (circleBase) filters.circleBase = circleBase;

  const primaryRune = params.get('primaryRune');
  if (primaryRune) filters.primaryRune = primaryRune;

  const modifierRunes = params.get('modifierRunes');
  if (modifierRunes) filters.modifierRunes = modifierRunes.split(',').filter(Boolean);

  const controlRune = params.get('controlRune');
  if (controlRune) filters.controlRune = controlRune;

  const status = params.get('status');
  if (status) filters.status = status as SpellStatus;

  if (params.get('needsEnrichment') === 'true') filters.needsEnrichment = true;

  const limit = params.get('limit');
  if (limit) filters.limit = Number(limit);
  const offset = params.get('offset');
  if (offset) filters.offset = Number(offset);

  return filters;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const db = getDb();
  const filters = parseFilters(request.nextUrl.searchParams);
  const result = searchSpells(db, filters);
  return NextResponse.json(result);
});
