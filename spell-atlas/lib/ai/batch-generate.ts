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
                'One to two sentences. Functional: what it does and a practical use. Niche: the real limited effect and why the use-case is narrow. Dud: what happens when cast (fizzle, collapse, no useful effect).',
            },
            summary: { type: 'string', description: 'A short tagline, max 50 characters, for quick reference in a table.' },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description:
                '1-2 tags. Prefer existing tags. Required when applicable: Hex for non-dud Draining; Enchanting for non-dud Activation; Sigil for useful non-dud Anchor; Support together with Hex when a Draining effect is beneficial. Only invent a new general-purpose tag if none fit.',
            },
            isDud: {
              type: 'boolean',
              description:
                'True when this rune combination lacks compatibility and would fizzle or fail in-world rather than producing a functional spell. Mutually exclusive with isNiche.',
            },
            isNiche: {
              type: 'boolean',
              description:
                'True when the combination is technically functional but only useful in extremely narrow, unlikely, or impractical scenarios. Mutually exclusive with isDud.',
            },
          },
          required: ['id', 'name', 'description', 'summary', 'tags', 'isDud', 'isNiche'],
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

WHAT YOU ARE WRITING:
- These are SPELL CIRCLES (spells for short) -- completed castable spell formulas built from runes.
- They are NOT rituals. In this story, rituals are a separate category of magic entirely.
- Even if a Circle Base meaning mentions historical origins (e.g. body-tempering practices that inspired Targeted), NEVER call the result a ritual, tempering rite, tempering ritual, or similar. Describe it as a spell / spell circle being cast.
- Forbidden flavor words unless a rune meaning explicitly requires them: "ritual", "rite", "ceremony", "tempering ritual".

The magic system works by combining:
1. A Circle Base (how the spell is structured/delivered: e.g. a single target, a projectile, a zone, a trap, an alteration)
2. A Primary Rune (the core magical effect)
3. Modifier Rune(s) -- zero, one, or two of these -- that alter the effect
4. A Control Rune (optional) that changes how mana is paid and/or how concentration works

FIRM MAGIC-SYSTEM RULES -- never bend these for a prettier description:
- Default cast (no special control rune): the spell activates once the mana cost is paid by the caster. Do not invent ongoing caster drain or sustained upkeep.
- Follow each rune's own meaning text carefully (given below per spell). Prefer that text over assumptions from the rune's name alone.
- Do not invent mechanics the runes do not support. If a combination is awkward, mark it dud or niche rather than rewriting a rune's meaning.
- Additional modifiers stack onto the same core effect (e.g. Extend lengthens duration of whatever the spell actually does). They do NOT license changing a modifier's meaning.

ENCHANTING vs SIGILS (do not confuse these):
- Enchanting = a spell circle permanently engraved onto an item or surface. Reusable. Anchor is NEVER used for enchanting -- it would be a wasted control rune there.
- Sigil (Anchor control rune) = the spell circle itself is stuck/glued/anchored to a surface during creation and remains there until it activates once, then the circle dissipates. Temporary, made on the fly -- a pseudo-enchantment, not a true engraving.
- Example Sigil: Area + Fire + Delayed + Anchor -- stick the circle to a rock, throw it; when the delay ends it detonates as AoE fire (improvised magical grenade). Practical because it is temporary and improvised. A true enchantment of the same idea would skip Anchor and free that slot for Empower (or similar) for a stronger reusable item.
- If the Control Rune is Anchor: treat the spell as a Sigil. Useful ones should include "Sigil" in the name and use the Sigil tag. Many Anchor combinations are niche; many are duds with little/no practical effect because Anchor adds nothing useful to that pairing. Prefer dud/niche over inventing a permanent enchantment.

CONTROL RUNES -- not interchangeable:
- Channeling:
  - The CASTER must continually contribute focus and mana while the effect lasts. Mana is paid by the caster.
  - Concentration must be maintained for the whole channeled duration; breaking it ends the spell.
  - Main purpose: longer-than-normal duration and/or a controlled end. Secondary: often a small power boost (weaker than Empower).
  - HARD DUD: Channeling + Extend is ALWAYS a dud. Duration is already governed by channeling, so Extend is pointless (Alex would never use this). It may not fizzle -- mark isDud true because it is useless, and say so honestly in the description.
- Draining:
  - Mana is ALWAYS paid by the TARGET (whatever the spell is cast on / draining from) -- NEVER by the caster. Do not write that the caster pays mana for Draining spells.
  - If cast on the caster himself, he is the target (so he pays as target, not as "caster upkeep"). If cast on someone else, THEY pay -- that is a HEX.
  - Caster maintains concentration only during the draining/casting process. If concentration breaks before activation, the spell falls apart and does not activate. After activation, focus can shift.
  - High-cost exception: may pull mana gradually from the target until the activation cost is gathered, then activate. That is not Channeling-style sustain of an active effect.
  - Tagging: every non-dud Draining spell MUST include the Hex tag. If the hexed effect is beneficial (e.g. Swift on an ally), also include Support -- Hex is not inherently hostile.
  - Draining is mainly for hexes, not enchanting.
- Activation:
  - Primarily for enchanting (engraved reusable circles). Can appear in ordinary casting, but that is less common.
  - Write descriptions so the spell could work as an enchantment and, secondarily, as a normal cast when that still makes sense.
  - Tagging: every non-dud Activation spell MUST include the Enchanting tag.
- Anchor:
  - Sticks the spell circle to a surface until one-shot activation, then the circle dissipates (Sigil -- see above). Not enchanting. Never describe Anchor spells as engraved/permanent enchantments.
- Never describe Channeling behavior unless Control is Channeling; never describe Draining/target-paid mana unless Control is Draining; never describe Sigil stick-and-detonate behavior unless Control is Anchor.

EXEMPT modifier -- critical, often mishandled:
- Exempt means carving a designated subject out of THIS spell's effect, usually by introducing their blood or mana into the casting so the magic recognizes and skips them.
- Exempt is NOT "opposite", NOT inversion of the primary effect, and NOT a resistance/buff/ward against that effect type.
- Correct: Area + Fire + Exempt burns the area; designated allies who contributed blood/mana are untouched by that fire.
- Incorrect (never do this): Exempt + Swift/slow/speed -> "grants resistance to slowing/speed alteration" or "keeps them steady against slowing". That is inventing a resistance buff.
- Also incorrect: describing Exempt as protective tempering, steadfastness against an effect, immunity ward, etc.
- Targeted + Exempt is especially awkward: if the only subject is the target and Exempt removes them from the effect, the result may cancel itself or only matter in extremely narrow cases (e.g. releasing one specific person from a prior effect of that primary type). Mark those niche (or dud if they fail to cohere). Do NOT "rescue" them by turning Exempt into resistance.
- When Extend (or another modifier) is added to an Exempt spell, it extends/modifies the real Exempt-based effect -- it does not unlock a resistance reinterpretation.

IMPORTANT -- think creatively about each combination:
- The same rune can be offensive OR defensive OR utility depending on the base and modifiers. Don't default to combat.
- Consider non-combat applications: powering devices, preservation, cleaning, travel, crafting, communication.
- A "trap" base isn't only for enemies -- it can create a beneficial zone allies walk through.
- An "alteration" base changes properties -- this could buff allies or debuff enemies.
- An "area" base could be a protective dome, not just a damage zone.
- Creativity must stay inside the firm rules above. Cleverness that breaks Exempt, ritual/spell wording, or Channeling/Draining rules is wrong.

SPELL USEFULNESS TIERS -- choose exactly one:
- Functional (isDud false, isNiche false): something a mage would reasonably cast in ordinary circumstances.
- Niche (isNiche true, isDud false): technically works, but only in extremely narrow/unlikely/impractical scenarios. Common for many Anchor/Sigil combinations that only barely make sense.
- Dud (isDud true, isNiche false): either (1) the casting fizzles/fails to cohere, OR (2) it would "work" but is completely useless so Alex would never use it (e.g. Channeling + Extend). Prefer honest uselessness over inventing a strained use.
- Never set both isDud and isNiche to true.
- Known hard dud: Control Channeling + modifier Extend -> always isDud true.

NAMING:
- 2-4 words, evocative and thematic, reflecting the actual effect the runes produce.
- Do not use cost/economy metaphors in the name (e.g. "Costly", "Expensive") unless a rune explicitly justifies that framing.
- Do not use "Ritual", "Rite", or "Tempering" in names for these spell circles.
- If Control is Anchor and the spell is not a dud: include "Sigil" in the name (e.g. "Fireburst Sigil", "Delayfire Sigil").
- For duds, the name may reflect failure, instability, or pointless redundancy. For niche spells, match the real limited effect.

TAGGING RULES (in addition to purpose tags; still prefer 1-2 tags total, using required tags first):
- Draining + not dud: MUST include Hex. If the effect is beneficial/ally-facing, also include Support when a second tag slot is available (or prefer Support+Hex over Combat).
- Activation + not dud: MUST include Enchanting.
- Anchor + not dud / useful Sigil: MUST include Sigil.
- Prefer existing tags from the provided list. Only invent a new general-purpose tag if none fit. Do not invent tags that only mean niche/dud.

SELF-CHECK BEFORE SUBMITTING (mandatory):
For every spell in the batch, verify all of the following and fix any failure before you call the tool:
1. Description never calls it a ritual/rite/ceremony.
2. If Exempt is present: description does NOT grant resistance, immunity, wards against, or "steadiness against" the primary effect.
3. If Draining: mana is paid by the TARGET, never described as caster-paid; Hex tag present unless dud.
4. If Channeling: mana/focus from the CASTER; if Extend is also present -> isDud true.
5. If Activation and not dud: Enchanting tag present; description works as enchantment (and optionally normal cast).
6. If Anchor: described as a temporary stuck Sigil (one-shot, then dissipates), NOT a permanent engraving; useful ones named/tagged Sigil; many others niche/dud.
7. Extra modifiers do not rewrite Exempt/Anchor/control meanings.
8. isDud / isNiche flags match the usefulness tiers.

You will be given a BATCH of multiple spell combinations at once, each with a unique id. For each one, generate:
- name: 2-4 words, following the naming rules above.
- description: one to two sentences. Functional: what it does and a practical use. Niche: what it does and why the use-case is narrow. Dud: fizzle/collapse OR why the combination is useless.
- summary: a short tagline (max 50 characters) for a quick-reference table.
- tags: 1-2 tags following the tagging rules above.
- isDud / isNiche: set according to the usefulness tiers above.

Be diverse -- not every spell is "Combat". Many combinations are Utility, Support, Hex, Sigil, or Enchanting depending on what the base/rune/modifiers actually do.

Respond ONLY by calling the ${BATCH_TOOL_NAME} tool with one entry per spell id you were given, in the same order, with no ids skipped or invented.`;
}

export function buildBatchUserPrompt(spells: SpellRecord[], meanings: RuneMeaningConfig, existingTagNames: string[]): string {
  const tagList = existingTagNames.length > 0 ? existingTagNames.join(', ') : '(no tags exist yet -- you may introduce some)';
  const spellBlocks = spells.map((spell) => `### Spell id: ${spell.id}\n${buildSpellContext(spell, meanings)}`).join('\n\n');

  return `Existing tags currently in use (prefer these): ${tagList}

Generate a name, description, summary, and tags for each of these ${spells.length} spells.

Before calling the tool, re-check every entry against: (a) spell not ritual, (b) Exempt is exclusion not resistance, (c) Draining = target pays mana + Hex tag, Channeling = caster pays, (d) Channeling+Extend = dud, (e) Activation non-duds include Enchanting, (f) Anchor = Sigil mechanics/name/tag when useful else niche/dud -- never permanent enchantment.

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
  isNiche?: boolean;
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

  const patch: { customName?: string; description?: string; summary?: string; tags?: string[]; status?: 'normal' | 'dud' | 'niche' } = {};
  const generatedFields: string[] = [];
  let newTagsCreated: string[] = [];
  let finalTags = spell.tags;

  // Only auto-promote from normal; never overwrite favorite/hand-curated status.
  const markDud = spell.status === 'normal' && Boolean(generated.isDud);
  const markNiche = spell.status === 'normal' && !markDud && Boolean(generated.isNiche);
  if (markDud) {
    patch.status = 'dud';
    generatedFields.push('status');
  } else if (markNiche) {
    patch.status = 'niche';
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
  // Duds should not keep purpose tags -- they clutter filters.
  if (markDud) {
    patch.tags = [];
    finalTags = [];
    generatedFields.push('tags');
  } else if (!hasTags && Array.isArray(generated.tags) && generated.tags.length > 0) {
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
