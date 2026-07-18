import Anthropic from '@anthropic-ai/sdk';
import type Database from 'better-sqlite3';
import type { RuneMeaningConfig, SpellRecord } from '@/lib/core/types';
import { updateSpell } from '@/lib/db/spells';

/**
 * Batched AI description generation, adapted from the author's original
 * generate_spells_advanced.py script. The key difference from that script
 * (which made one API call per spell) is that this bundles many spells
 * into a single call -- with combinatorial spell growth, one-call-per-spell
 * would make routine batches of 100+ calls, which is slow and wastes
 * tokens re-sending the same system prompt every time. Batching + prompt
 * caching (see the cache_control marker in the route handler) collapses
 * that to a small number of calls per run.
 */

const BATCH_TOOL_NAME = 'submit_spell_batch';

export const BATCH_TOOL: Anthropic.Tool = {
  name: BATCH_TOOL_NAME,
  description: 'Submit generated name/description/summary/tags for every spell in this batch.',
  input_schema: {
    type: 'object',
    properties: {
      spells: {
        type: 'array',
        description: 'One entry per spell id given in the prompt, in the same order, with no ids skipped.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The exact spell id from the prompt.' },
            name: { type: 'string', description: '2-4 word evocative spell name.' },
            description: {
              type: 'string',
              description:
                'One to two sentences. For functional spells: what it does and a practical use. For incompatible combinations (isDud true): what happens when cast -- typically fizzling, failing to cohere, or producing no useful effect.',
            },
            summary: { type: 'string', description: 'A short tagline, max 50 characters, for quick reference in a table.' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description:
                '1-2 tags for this spell. Strongly prefer reusing one of the existing tags listed in the prompt. Only propose a new tag if none of the existing ones fit at all, and only if the concept is general enough to plausibly apply to other spells too (never a tag specific to this one spell).',
            },
            isDud: {
              type: 'boolean',
              description:
                'True when this rune combination lacks compatibility and would fizzle or fail in-world rather than producing a functional spell. Do not force a working spell when the runes do not logically combine.',
            },
          },
          required: ['id', 'name', 'description', 'summary', 'tags', 'isDud'],
        },
      },
    },
    required: ['spells'],
  },
};

function meaningLine(label: string, name: string, meanings: Record<string, string>): string {
  const meaning = meanings[name];
  return meaning ? `${label} (${name}): ${meaning}` : `${label}: ${name}`;
}

/** Builds a compact text description of one spell's rune combination,
 * pulling in whatever "meaning" notes the author has filled in for each
 * rune. Mirrors build_spell_context() from the original script. */
export function buildSpellContext(spell: SpellRecord, meanings: RuneMeaningConfig): string {
  const lines: string[] = [];
  lines.push(meaningLine('Circle Base', spell.circleBase, meanings.circleBaseMeanings));
  lines.push(meaningLine('Primary Rune', spell.primaryRune, meanings.primaryMeanings));
  if (spell.modifierRunes.length > 0) {
    const modDescriptions = spell.modifierRunes.map((m) => {
      const meaning = meanings.modifierMeanings[m];
      return meaning ? `${m} (${meaning})` : m;
    });
    lines.push(`Modifiers: ${modDescriptions.join(', ')}`);
  }
  if (spell.controlRune) {
    lines.push(meaningLine('Control', spell.controlRune, meanings.controlMeanings));
  }
  return lines.join('\n');
}

export function buildBatchSystemPrompt(): string {
  return `You are a fantasy worldbuilder writing spell names and descriptions for a sophisticated runic magic system used by a resourceful mage protagonist in a novel.

The magic system works by combining:
1. A Circle Base (how the spell is structured/delivered: e.g. a projectile, a zone, a trap, a touch effect)
2. A Primary Rune (the core magical effect)
3. Modifier Rune(s) -- zero, one, or two of these -- that alter the effect
4. A Control Rune (optional) that changes how/when the spell triggers or sustains

IMPORTANT -- think creatively about each combination:
- The same rune can be offensive OR defensive OR utility depending on the base and modifiers. Don't default to combat.
- Consider non-combat applications: powering devices, preservation, cleaning, travel, crafting, communication.
- A "trap" base isn't only for enemies -- it can create a beneficial zone allies walk through.
- An "alteration" base changes properties -- this could buff allies or debuff enemies.
- An "area" base could be a protective dome, not just a damage zone.
- Read each rune's own description carefully (given below per spell) -- it may explicitly describe non-obvious or dual-purpose behavior. Follow that description's intent over any assumption you'd otherwise make from the rune's name alone.

DUD / INCOMPATIBLE COMBINATIONS -- important:
- The combinatorial system generates every valid rune pairing, but NOT every pairing produces a functional spell in-world.
- In the story, spells that lack rune compatibility fizzle out, dissipate harmlessly, or fail to cohere -- this is normal and expected.
- When a combination does not logically work together, do NOT stretch or contort the logic to invent a functional use. It is better to honestly describe a failed or inert combination than to force a clever effect that strains credulity.
- For these spells: set isDud to true. Give a brief honest name and description of what happens when the mage tries it (fizzle, collapse, no effect, unstable flash, etc.). Tags can reflect failure or non-function if an existing tag fits.
- Reserve creative, functional descriptions for combinations that genuinely cohere. Be willing to mark combinations as duds when the runes clash -- not every spell needs to do something useful.

You will be given a BATCH of multiple spell combinations at once, each with a unique id. For each one, generate:
- name: 2-4 words, evocative and thematic. For duds, the name can reflect failure or instability rather than a useful effect.
- description: one to two sentences. For functional spells: what it does and a practical use. For duds: what happens when cast (typically fizzling or failing to cohere).
- summary: a short tagline (max 50 characters) for a quick-reference table.
- tags: 1-2 tags categorizing its PRIMARY purpose. You will be given the list of tags currently in use -- strongly prefer reusing one of those. Only introduce a new tag if none of the existing ones fit at all, and only if it's a general concept that could reasonably apply to other spells too (never invent a tag specific to just this one spell -- that defeats the point of tagging).
- isDud: true when the rune combination lacks compatibility and would fizzle or fail in-world; false when it produces a functional spell.

Be diverse -- not every spell is "Combat". Many combinations are Utility, Support, Defense, or Enchanting depending on what the base/rune/modifiers actually do.

Respond ONLY by calling the ${BATCH_TOOL_NAME} tool with one entry per spell id you were given, in the same order, with no ids skipped or invented.`;
}

export function buildBatchUserPrompt(spells: SpellRecord[], meanings: RuneMeaningConfig, existingTagNames: string[]): string {
  const tagList = existingTagNames.length > 0 ? existingTagNames.join(', ') : '(no tags exist yet -- you may introduce some)';
  const spellBlocks = spells.map((spell) => `### Spell id: ${spell.id}\n${buildSpellContext(spell, meanings)}`).join('\n\n');

  return `Existing tags currently in use (prefer these): ${tagList}

Generate a name, description, summary, and tags for each of these ${spells.length} spells:

${spellBlocks}

Call ${BATCH_TOOL_NAME} with exactly ${spells.length} entries, one per spell id above, in the same order.`;
}

export interface EnrichmentPatch {
  spellId: string;
  generatedFields: string[];
  tags: string[];
  newTagsCreated: string[];
  name: string;
}

/** Matches proposed tags against the tags already known this run
 * case-insensitively (preserving the existing tag's canonical casing), and
 * tracks which ones are genuinely new. `knownTags` is mutated in place so
 * later batches in the same run see tags created by earlier ones. */
export function reconcileTags(rawTags: string[], knownTags: Set<string>): { finalTags: string[]; newTagsCreated: string[] } {
  const lowerToCanonical = new Map(Array.from(knownTags).map((t) => [t.toLowerCase(), t]));
  const finalTags: string[] = [];
  const newTagsCreated: string[] = [];

  for (const raw of rawTags) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const existing = lowerToCanonical.get(trimmed.toLowerCase());
    if (existing) {
      if (!finalTags.includes(existing)) finalTags.push(existing);
    } else if (!finalTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      finalTags.push(trimmed);
      newTagsCreated.push(trimmed);
      lowerToCanonical.set(trimmed.toLowerCase(), trimmed);
      knownTags.add(trimmed);
    }
  }

  return { finalTags, newTagsCreated };
}

interface GeneratedSpellEntry {
  id: string;
  name: string;
  description: string;
  summary: string;
  tags: string[];
  isDud?: boolean;
}

/** Applies a model-generated entry to one spell, only filling fields that
 * are currently empty (never overwriting anything the author already
 * wrote), and reconciling tags against the run's known tag set. Returns
 * null if the spell was already fully complete (shouldn't normally happen
 * since the caller pre-filters, but kept as a safety net). */
export function applyGeneratedEntry(
  db: Database.Database,
  spell: SpellRecord,
  generated: GeneratedSpellEntry,
  knownTags: Set<string>
): EnrichmentPatch | null {
  const hasName = Boolean(spell.customName.trim());
  const hasDescription = Boolean(spell.description.trim());
  const hasSummary = Boolean(spell.summary.trim());
  const hasTags = spell.tags.length > 0;

  if (hasName && hasDescription && hasSummary && hasTags) return null;

  const patch: { customName?: string; description?: string; summary?: string; tags?: string[]; status?: 'normal' | 'dud' } = {};
  const generatedFields: string[] = [];
  let newTagsCreated: string[] = [];
  let finalTags = spell.tags;

  if (generated.isDud && spell.status === 'normal') {
    patch.status = 'dud';
    generatedFields.push('status');
  }

  if (!hasName && generated.name?.trim()) {
    patch.customName = generated.name.trim();
    generatedFields.push('name');
  }
  if (!hasDescription && generated.description?.trim()) {
    patch.description = generated.description.trim();
    generatedFields.push('description');
  }
  if (!hasSummary && generated.summary?.trim()) {
    patch.summary = generated.summary.trim().slice(0, 100);
    generatedFields.push('summary');
  }
  if (!hasTags && Array.isArray(generated.tags) && generated.tags.length > 0) {
    const reconciled = reconcileTags(generated.tags, knownTags);
    patch.tags = reconciled.finalTags;
    finalTags = reconciled.finalTags;
    newTagsCreated = reconciled.newTagsCreated;
    generatedFields.push('tags');
  }

  if (Object.keys(patch).length === 0) {
    return { spellId: spell.id, generatedFields: [], tags: finalTags, newTagsCreated: [], name: spell.customName || generated.name };
  }

  const updated = updateSpell(db, spell.id, patch);
  return {
    spellId: spell.id,
    generatedFields,
    tags: updated?.tags ?? finalTags,
    newTagsCreated,
    name: updated?.customName || generated.name,
  };
}

/** Extracts the forced tool call's parsed input from an Anthropic response,
 * or null if (unexpectedly) no tool_use block is present. */
export function extractBatchToolInput(response: Anthropic.Message): { spells: GeneratedSpellEntry[] } | null {
  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === BATCH_TOOL_NAME);
  if (!block) return null;
  return block.input as { spells: GeneratedSpellEntry[] };
}
