import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/lib/db/client';
import { ensureDefaultRunesSeeded, getRuneMeanings, getRuneNameConfig } from '@/lib/db/naming';
import { getAllTags } from '@/lib/db/tags';
import { getSpellById, getSpellsForEnrichment, type SearchFilters } from '@/lib/db/spells';
import {
  applyGeneratedEntry,
  BATCH_TOOL,
  buildBatchSystemPrompt,
  buildBatchUserPrompt,
  extractBatchToolInput,
} from '@/lib/ai/batch-generate';
import { generateSpellName } from '@/lib/core/spell-name-generator';
import { withErrorHandling } from '@/lib/api-utils';
import type { SpellRecord } from '@/lib/core/types';

const MODEL = process.env.ANTHROPIC_BATCH_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const MAX_SPELLS_PER_RUN = 500;
const DELAY_BETWEEN_BATCHES_MS = 400;

interface GenerateRequestBody {
  filters?: Pick<SearchFilters, 'circleBase' | 'primaryRune' | 'modifierRunes' | 'controlRune' | 'tags' | 'status'>;
  maxSpells?: number;
  batchSize?: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server. Set it as an environment variable.' },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as GenerateRequestBody;
  const maxSpells = Math.min(Math.max(body.maxSpells ?? 25, 1), MAX_SPELLS_PER_RUN);
  const batchSize = Math.min(Math.max(body.batchSize ?? DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);

  const db = getDb();
  ensureDefaultRunesSeeded(db);
  const meanings = getRuneMeanings(db);
  const nameConfig = getRuneNameConfig(db);
  const knownTags = new Set(getAllTags(db).map((t) => t.name));

  const spells = getSpellsForEnrichment(db, body.filters ?? {}, maxSpells);
  const batches = chunk(spells, batchSize);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildBatchSystemPrompt();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        } catch {
          // controller already closed (client disconnected) -- ignore
        }
      };

      write({ type: 'start', totalSpells: spells.length, batchCount: batches.length, model: MODEL });

      let succeeded = 0;
      let failed = 0;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        if (request.signal.aborted) break;
        const batch = batches[batchIndex];
        const spellById = new Map<string, SpellRecord>(batch.map((s) => [s.id, s]));

        try {
          const response = await client.messages.create(
            {
              model: MODEL,
              max_tokens: 4096,
              system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
              tools: [BATCH_TOOL],
              tool_choice: { type: 'tool', name: BATCH_TOOL.name },
              messages: [{ role: 'user', content: buildBatchUserPrompt(batch, meanings, Array.from(knownTags)) }],
            },
            { signal: request.signal }
          );

          const parsed = extractBatchToolInput(response);
          if (!parsed) {
            failed += batch.length;
            write({ type: 'batch_error', batchIndex, spellIds: batch.map((s) => s.id), message: 'Model did not return the expected tool call.' });
            continue;
          }

          const returnedIds = new Set(parsed.spells.map((s) => s.id));
          for (const spell of batch) {
            const generated = parsed.spells.find((s) => s.id === spell.id);
            if (!generated) {
              failed += 1;
              write({ type: 'spell', spellId: spell.id, status: 'error', message: 'Model response did not include this spell id.' });
              continue;
            }
            const result = applyGeneratedEntry(db, spell, generated, knownTags);
            succeeded += 1;
            const updated = getSpellById(db, spell.id) ?? spell;
            write({
              type: 'spell',
              spellId: spell.id,
              status: 'success',
              name: generateSpellName(updated, nameConfig),
              summary: updated.summary,
              description: updated.description,
              spellStatus: updated.status,
              circleBase: updated.circleBase,
              primaryRune: updated.primaryRune,
              modifierRunes: updated.modifierRunes,
              controlRune: updated.controlRune,
              generatedFields: result?.generatedFields ?? [],
              tags: result?.tags ?? updated.tags,
              newTagsCreated: result?.newTagsCreated ?? [],
            });
          }
          if (parsed.spells.length !== batch.length || Array.from(spellById.keys()).some((id) => !returnedIds.has(id))) {
            write({
              type: 'batch_warning',
              batchIndex,
              message: `Expected ${batch.length} entries, model returned ${parsed.spells.length}.`,
            });
          }
        } catch (err) {
          failed += batch.length;
          write({
            type: 'batch_error',
            batchIndex,
            spellIds: batch.map((s) => s.id),
            message: err instanceof Error ? err.message : 'Claude API request failed for this batch.',
          });
        }

        if (batchIndex < batches.length - 1 && !request.signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
      }

      write({ type: 'done', processed: succeeded + failed, succeeded, failed, aborted: request.signal.aborted });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
});
