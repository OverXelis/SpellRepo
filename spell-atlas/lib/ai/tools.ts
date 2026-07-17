import type Anthropic from '@anthropic-ai/sdk';
import { getReadOnlyDb } from '@/lib/db/client';
import { searchSpells, type SearchFilters } from '@/lib/db/spells';
import { getSpellsByIds } from '@/lib/db/spells';

/**
 * Tool definitions for the Claude chat. These are intentionally READ-ONLY --
 * there is no write/mutate tool here on purpose, and the executor functions
 * below query through getReadOnlyDb(), which opens SQLite in `readonly`
 * mode. Even if a tool's logic had a bug, the underlying connection cannot
 * perform writes.
 *
 * Design goal: never require the model to see the whole spell table. Each
 * tool either returns a small, bounded object (taxonomy-shaped orientation
 * data) or a capped, paginated slice of search results. The model is
 * expected to narrow with filters/tags before requesting full details.
 */
export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_spells',
    description:
      'Search the spell database. Returns compact rows (name, runes, tags, one-line summary) plus totalMatches so you know whether to narrow further. Never returns the whole database -- results are capped. Use this iteratively: start broad or with a guess at relevant tags/runes, check totalMatches, then narrow with more filters or a more specific query before calling get_spell_details.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search across spell name, summary, description, tags, and rune names.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to spells having these tags.',
        },
        tagMode: {
          type: 'string',
          enum: ['all', 'any'],
          description: "Whether a spell must have ALL listed tags or ANY of them. Defaults to 'all'.",
        },
        circleBase: { type: 'string', description: 'Exact circle base name.' },
        primaryRune: { type: 'string', description: 'Exact primary rune name.' },
        modifierRunes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Spell must include ALL of these modifier runes (spells have at most 2 modifiers).',
        },
        controlRune: {
          type: 'string',
          description: "Exact control rune name, or 'none' to find spells with no control rune.",
        },
        status: {
          type: 'string',
          enum: ['normal', 'favorite', 'dud'],
          description: "Filter by curation status. Omit to include all. 'dud' spells were marked as not useful/interesting -- usually skip these unless asked.",
        },
        limit: { type: 'number', description: 'Max rows to return (default 10, hard cap 25).' },
        offset: { type: 'number', description: 'Pagination offset (default 0).' },
      },
    },
  },
  {
    name: 'get_spell_details',
    description:
      'Fetch full details (including the long-form description) for specific spells by id, once search_spells has narrowed down candidates. Capped at 10 ids per call.',
    input_schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Spell ids to fetch full details for (max 10).',
        },
      },
      required: ['ids'],
    },
  },
];

export async function executeTool(name: string, input: unknown): Promise<unknown> {
  const db = getReadOnlyDb();

  if (name === 'search_spells') {
    const filters = (input ?? {}) as SearchFilters;
    return searchSpells(db, filters);
  }

  if (name === 'get_spell_details') {
    const { ids } = (input ?? {}) as { ids?: string[] };
    const capped = (ids ?? []).slice(0, 10);
    return { spells: getSpellsByIds(db, capped) };
  }

  return { error: `Unknown tool: ${name}` };
}
