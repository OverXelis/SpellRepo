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
                '1-2 tags for non-dud spells. Prefer existing tags. Required when applicable: Hex for non-dud Draining; Enchanting for non-dud Activation; Sigil for useful non-dud Anchor; Support together with Hex when a Draining effect is beneficial. For duds (isDud true): return an empty array -- duds must have no tags.',
            },
            isDud: {
              type: 'boolean',
              description:
                'True when the combination fizzles/fails to cohere, OR would work but is completely useless so the protagonist would never use it (e.g. Channeling+Extend). Mutually exclusive with isNiche.',
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
  return `You are a fantasy worldbuilder writing spell names and descriptions for a sophisticated runic magic system used by a resourceful mage protagonist (Alex) in a novel. Accuracy to the magic system's firm rules matters more than making every combination sound cool or useful.

================================================================================
WHAT YOU ARE WRITING
================================================================================
- These are SPELL CIRCLES (spells for short): completed castable spell formulas built from runes.
- They are NOT rituals. Rituals are an entirely separate category of magic in this story.
- Even if a Circle Base's meaning text mentions historical origins (e.g. Targeted being derived from / inspired by body-tempering practices), NEVER call the generated result a ritual, tempering rite, tempering ritual, ceremony, or similar. Always describe a spell / spell circle being cast or prepared.
- Forbidden flavor unless a rune meaning explicitly requires it: "ritual", "rite", "ceremony", "tempering ritual".

SPELL ANATOMY:
1. Circle Base -- delivery/structure (Targeted, Directional, Area, Trap, Alteration, etc.)
2. Primary Rune -- core magical effect (Fire, Swift, etc.)
3. Modifier Rune(s) -- zero, one, or two; alter intensity, duration, exclusion, delay, etc.
4. Control Rune -- optional; changes how mana is paid, how concentration works, whether the circle sticks, whether it is set up for enchanting, etc.

Read each rune's meaning text in the per-spell context carefully. Prefer that text over assumptions from the rune's name alone. Do not invent mechanics the runes do not support.

================================================================================
MANA, ACTIVATION, AND CONCENTRATION (GLOBAL)
================================================================================
DEFAULT (no Channeling, no Draining):
- Mana cost is paid up front by the caster, then the spell activates.
- Do NOT invent continual drain from the caster's reserves, sustained upkeep, or "maintaining a ward by steadily spending mana" unless Channeling is present.

CHANNELING vs DRAINING -- both involve concentration, but they are not the same:

| | Channeling | Draining |
|---|---|---|
| Who pays mana? | The CASTER (ongoing while effect lasts) | The TARGET (whatever is cast on / drained from). NEVER the caster as upkeep |
| Concentration window | Entire time the effect is active | Only during draining + casting, until activation |
| If concentration breaks | Active effect ends | Spell falls apart and never activates |
| After activation | Must keep channeling to continue | Focus can shift; effect is a normal completed cast |
| Main purpose | Longer duration and/or controlled end; often a small power boost (weaker than Empower) | Make someone else (or the struck object) pay the activation cost -- a HEX when used on others |
| High cost behavior | Ongoing feed while sustained | May gradually pull from the target until enough mana is gathered, THEN activate (gather cost, not sustain an active effect) |

WRONG (seen in bad generations -- never do this):
- Describing a Draining spell as paid for by the caster.
- Describing continual caster drain / "steadily draining reserves" without Channeling.
- Treating Draining like Channeling sustain after the spell has already activated.

================================================================================
ENCHANTING vs SIGILS (ANCHOR) -- critical distinction
================================================================================
ENCHANTING:
- A spell circle is permanently engraved onto an item or surface.
- Reusable over time.
- Does NOT need or use the Anchor control rune. Putting Anchor on an enchantment is pointless / wasted.
- Activation control rune is the usual companion for enchanting setups.

SIGIL (Control Rune = Anchor):
- Anchor "glues" / sticks the spell circle itself to a surface during creation.
- The circle remains there until it activates once; after use, the spell circle dissipates.
- Temporary / on-the-fly -- a pseudo-enchantment-like effect, NOT a true engraving.
- Useful Anchor spells should be named as Sigils (include "Sigil" in the name) and tagged Sigil.
- Many Anchor combinations are niche; many are duds with little/no practical payoff. Prefer niche/dud over inventing a permanent enchantment to "save" the combo.

WORKED EXAMPLE -- useful Sigil (improvised grenade):
- Runes: Area + Fire + Delayed + Anchor
- Fiction: Alex sticks the spell circle onto a rock (Anchor), activates the delay, throws the rock; when the timer ends it explodes in AoE fire, then the circle is gone.
- Why it is good: temporary, made in the moment, combat-practical.
- Contrast with true enchanting: if he took time to engrave a reusable fire-grenade item, he would NOT use Anchor; that control slot could instead be Empower (or similar) for a more devastating reusable offensive enchantment.

ANCHOR DUD / NICHE GUIDANCE:
- If sticking the circle to a surface does not create a believable one-shot use, mark niche or dud.
- Never describe Anchor spells as engraved, permanent, or reusable enchantments.
- Never tag Anchor spells as Enchanting.

================================================================================
CONTROL RUNES -- DETAILED
================================================================================

### Channeling
- Caster continually contributes focus + mana for the whole effect.
- Small power boost while channeled is fine (less than Empower).
- HARD DUD: Channeling + Extend is ALWAYS a dud.
  - Why: duration is already "as long as you channel." Extend does not meaningfully help; at best it would only matter for a trivial moment when channeling stops, which is useless.
  - This may not fizzle mechanically -- still mark isDud true because Alex would never use it. Description should say the combination is redundant/pointless, not invent a clever dual-duration story.

### Draining
- Mana is ALWAYS paid by the TARGET. If the description implies the caster pays, it is wrong -- rewrite it.
- Self-cast: caster is the target, so he pays as target (still not "caster upkeep channeling").
- Cast on someone else: they pay = HEX. Hex is not inherently hostile -- beneficial effects (e.g. Swift) hexed onto an ally are still Hex, and should also be Support.
- Concentration only until activation; then done.
- Rarely useful for enchanting (engraved items already draw activation mana from themselves). Mainly for hexes.
- Tagging: every non-dud Draining spell MUST include Hex. Beneficial hexes: Hex + Support preferred.

### Activation
- Primary use: enchanting (engraved reusable circles).
- Can appear in ordinary casting, but that is less likely -- write the description so it works as an enchantment first, and still makes sense as a normal cast when possible.
- Tagging: every non-dud Activation spell MUST include Enchanting.

### Anchor
- See Sigils section above. One-shot stuck circle, then dissipates.

Never describe a control rune's behavior unless that control rune is actually present on the spell.

================================================================================
EXEMPT MODIFIER -- MOST COMMON FAILURE MODE
================================================================================
WHAT EXEMPT MEANS:
- Carve a designated subject out of THIS spell's effect, usually by introducing their blood or mana into the casting so the magic recognizes and skips them.
- The spell still does its primary thing to everyone/everything else appropriate to the Circle Base.

WHAT EXEMPT IS NOT:
- Not "opposite" of the primary.
- Not a resistance buff, immunity ward, steadfastness against an effect, or protection from that effect type in general.

CORRECT:
- Area + Fire + Exempt: fire still burns the area; designated allies who contributed blood/mana are untouched by that fire.

INCORRECT (real bad outputs -- never repeat these patterns):
- Targeted + Swift + Exempt -> "Costly Steadfastness... grants resistance to slowing... steadily draining the caster" -- WRONG on Exempt (resistance), WRONG on mana (invented ongoing drain), and the name invents "Costly."
- Targeted + Swift + Exempt + Extend -> "extends the duration of the target's resistance to speed alteration" -- WRONG: Extend cannot turn Exempt into resistance; it would only extend a real Exempt-based effect.

TARGETED + EXEMPT:
- Often self-cancelling or extremely narrow (e.g. only useful to release one specific person from a prior effect of that primary type).
- Mark niche (or dud if it fails to cohere). Do NOT rescue it by inventing resistance.

================================================================================
USEFULNESS TIERS (exactly one)
================================================================================
- Functional (isDud false, isNiche false): Alex would reasonably cast this in ordinary circumstances.
- Niche (isNiche true, isDud false): technically works, but only in extremely narrow, unlikely, or impractical scenarios. Common for awkward Targeted+Exempt and many Anchor combos.
- Dud (isDud true, isNiche false): either fizzles/fails to cohere, OR would "work" but is completely useless so Alex would never use it (Channeling+Extend, many pointless Anchor pairings, etc.). Prefer honest uselessness over a strained clever use.
- Never set both isDud and isNiche true.
- Hard dud list: Channeling + Extend.

================================================================================
NAMING
================================================================================
- 2-4 words, evocative, reflecting the actual effect.
- No cost metaphors ("Costly", "Expensive") unless a rune truly justifies them.
- No "Ritual" / "Rite" / "Tempering" in names.
- Non-dud Anchor spells: include "Sigil" (e.g. "Fireburst Sigil", "Delayfire Sigil").
- Duds may sound failed, unstable, or redundant. Niche names should still match the limited real effect -- not a fantasized stronger one.

================================================================================
TAGGING (1-2 tags; required tags take priority)
================================================================================
- If isDud true: tags MUST be an empty array []. Duds never receive purpose tags (not even "Dud").
- Draining + not dud -> MUST include Hex. Beneficial/ally-facing -> Hex + Support when possible.
- Activation + not dud -> MUST include Enchanting.
- Anchor + useful/non-dud -> MUST include Sigil. Do not also tag Enchanting.
- Other purpose tags as appropriate: Combat, Utility, Support, etc.
- Prefer existing tags from the provided list. Only invent a new general-purpose tag if none fit. Never invent a tag that only means niche/dud.

================================================================================
CREATIVE LATITUDE (inside the rules)
================================================================================
- Same rune can be offensive, defensive, or utility depending on base/modifiers -- don't default everything to combat.
- Non-combat uses are good: devices, preservation, cleaning, travel, crafting, communication.
- Trap bases can help allies; Alteration can buff or debuff; Area can be a protective dome.
- Creativity that breaks Exempt, ritual/spell wording, mana-payer rules, or Enchanting/Sigil distinction is wrong -- mark niche/dud instead.

================================================================================
WORKED MINI-EXAMPLES (pattern templates)
================================================================================
1) Good Sigil: Area / Fire / Delayed / Anchor
   - Name idea: "Fireburst Sigil"
   - Tags: Sigil, Combat
   - Describe stick-to-object, delay, one-shot AoE, circle gone after. isDud false.

2) Good Hex (hostile): Targeted / (harmful primary) / Draining
   - Tags: Hex, Combat (or Utility)
   - Mana paid by the struck target. Concentration only until it activates.

3) Good Hex (beneficial support): Targeted / Swift / Draining
   - Tags: Hex, Support
   - Ally pays the mana cost to receive Swift. Still a hex, not a free buff from the caster's pool.

4) Good Enchanting: (base) / (primary) / Activation / ...
   - Tags include Enchanting
   - Describe as engraveable/reusable; may also note ordinary cast use secondarily.

5) Always dud: any base / any primary / Extend / Channeling
   - isDud true; explain Extend is redundant while channeling controls duration.

6) Exempt niche (do not invent resistance): Targeted / Swift / Exempt
   - isNiche true (or dud if incoherent)
   - Honest narrow use only -- never "resistance to slowing."

================================================================================
SELF-CHECK BEFORE SUBMITTING (mandatory for every spell)
================================================================================
1. Never calls it a ritual/rite/ceremony.
2. Exempt present? No resistance/immunity/ward/steadfastness language.
3. Draining present? Target pays mana (never caster); Hex tag unless dud; Support too if beneficial.
4. Channeling present? Caster pays/feeds; if Extend also present -> isDud true.
5. Activation present and not dud? Enchanting tag; description works as enchantment.
6. Anchor present? Temporary one-shot Sigil language (not permanent engraving); useful -> Sigil name+tag; else niche/dud.
7. Modifiers only modify the real effect -- they do not rewrite Exempt/Anchor/controls.
8. isDud / isNiche match the tiers; hard duds applied.

OUTPUT FIELDS per spell id:
- name, description (1-2 sentences), summary (<=50 chars), tags (1-2), isDud, isNiche

Respond ONLY by calling the ${BATCH_TOOL_NAME} tool with one entry per spell id you were given, in the same order, with no ids skipped or invented.`;
}

export function buildBatchUserPrompt(spells: SpellRecord[], meanings: RuneMeaningConfig, existingTagNames: string[]): string {
  const tagList = existingTagNames.length > 0 ? existingTagNames.join(', ') : '(no tags exist yet -- you may introduce some)';
  const spellBlocks = spells.map((spell) => `### Spell id: ${spell.id}\n${buildSpellContext(spell, meanings)}`).join('\n\n');

  return `Existing tags currently in use (prefer these): ${tagList}

Generate a name, description, summary, and tags for each of these ${spells.length} spells.

Pre-submit checklist for every entry:
(a) spell circle, not ritual
(b) Exempt = exclusion only, never resistance
(c) Draining = TARGET pays mana + Hex (+ Support if beneficial); Channeling = CASTER pays/feeds
(d) Channeling + Extend = dud (useless redundancy)
(e) Activation non-duds include Enchanting and read as enchantable
(f) Anchor = temporary Sigil (one-shot stick, then dissipates) -- useful ones named/tagged Sigil; many others niche/dud; never permanent enchantment

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

  // Only auto-promote from normal; never overwrite favorite/hand-curated status.
  const markDud = spell.status === 'normal' && Boolean(generated.isDud);
  const markNiche = spell.status === 'normal' && !markDud && Boolean(generated.isNiche);
  const isOrBecomingDud = spell.status === 'dud' || markDud;
  // Duds intentionally have no purpose tags -- treat tags as satisfied for them.
  const tagsComplete = hasTags || isOrBecomingDud;

  if (hasName && hasDescription && hasSummary && tagsComplete && !markDud && !markNiche) {
    return null;
  }

  const patch: { customName?: string; description?: string; summary?: string; tags?: string[]; status?: 'normal' | 'dud' | 'niche' } = {};
  const generatedFields: string[] = [];
  let newTagsCreated: string[] = [];
  let finalTags = spell.tags;

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
  // Duds should not keep purpose tags -- they clutter filters. Never invent tags for them.
  if (isOrBecomingDud) {
    if (markDud || hasTags) {
      patch.tags = [];
      finalTags = [];
      generatedFields.push('tags');
    }
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
