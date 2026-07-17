import { nanoid } from 'nanoid';
import type { RuneLists, SpellRecord } from './types';

/**
 * Creates a canonical key for deduplication. Modifiers are sorted
 * alphabetically for consistent comparison. Ported unchanged from the
 * original spell-circle-db app's combination logic.
 */
function canonicalKey(
  circleBase: string,
  primaryRune: string,
  modifiers: string[],
  control: string | null
): string {
  const sortedMods = [...modifiers].sort();
  return `${circleBase}||${primaryRune}||M:${sortedMods.join('|')}||C:${control ?? ''}`;
}

function createSpell(
  circleBase: string,
  primaryRune: string,
  modifiers: string[],
  control: string | null
): SpellRecord {
  const now = Date.now();
  return {
    id: nanoid(),
    circleBase,
    primaryRune,
    modifierRunes: [...modifiers].sort(),
    controlRune: control,
    createdAt: now,
    updatedAt: now,
    tags: [],
    status: 'normal',
    description: '',
    customName: '',
    summary: '',
  };
}

function existingKeySet(existingSpells: Pick<SpellRecord, 'circleBase' | 'primaryRune' | 'modifierRunes' | 'controlRune'>[]): Set<string> {
  return new Set(
    existingSpells.map((s) => canonicalKey(s.circleBase, s.primaryRune, s.modifierRunes, s.controlRune))
  );
}

/**
 * Generate all combinations for a new Primary Rune.
 *
 * Valid patterns:
 * - 0 modifiers, 0 controls
 * - 1 modifier, 0 controls
 * - 2 modifiers, 0 controls
 * - 0 modifiers, 1 control
 * - 1 modifier, 1 control
 */
export function generateForNewPrimary(
  runeLists: RuneLists,
  newPrimary: string,
  existingSpells: SpellRecord[]
): SpellRecord[] {
  const existingKeys = existingKeySet(existingSpells);
  const newSpells: SpellRecord[] = [];
  const { circleBases, modifierRunes, controlRunes } = runeLists;

  for (const circleBase of circleBases) {
    const addIfNew = (mods: string[], control: string | null) => {
      const key = canonicalKey(circleBase, newPrimary, mods, control);
      if (!existingKeys.has(key)) {
        newSpells.push(createSpell(circleBase, newPrimary, mods, control));
        existingKeys.add(key);
      }
    };

    addIfNew([], null);
    for (const m of modifierRunes) addIfNew([m], null);
    for (let i = 0; i < modifierRunes.length; i++) {
      for (let j = i + 1; j < modifierRunes.length; j++) {
        addIfNew([modifierRunes[i], modifierRunes[j]], null);
      }
    }
    for (const c of controlRunes) addIfNew([], c);
    for (const m of modifierRunes) {
      for (const c of controlRunes) addIfNew([m], c);
    }
  }

  return newSpells;
}

/**
 * Generate combinations for a new Modifier Rune, across all existing
 * primaries.
 */
export function generateForNewModifier(
  runeLists: RuneLists,
  newModifier: string,
  existingSpells: SpellRecord[]
): SpellRecord[] {
  const existingKeys = existingKeySet(existingSpells);
  const newSpells: SpellRecord[] = [];
  const { circleBases, primaryRunes, modifierRunes, controlRunes } = runeLists;

  const allModifiers = modifierRunes.includes(newModifier)
    ? modifierRunes
    : [...modifierRunes, newModifier];

  for (const primary of primaryRunes) {
    for (const circleBase of circleBases) {
      const addIfNew = (mods: string[], control: string | null) => {
        const key = canonicalKey(circleBase, primary, mods, control);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, mods, control));
          existingKeys.add(key);
        }
      };

      addIfNew([newModifier], null);
      for (const mOld of allModifiers) {
        if (mOld === newModifier) continue;
        addIfNew([newModifier, mOld], null);
      }
      for (const c of controlRunes) addIfNew([newModifier], c);
    }
  }

  return newSpells;
}

/**
 * Generate combinations for a new Control Rune, across all existing
 * primaries.
 */
export function generateForNewControl(
  runeLists: RuneLists,
  newControl: string,
  existingSpells: SpellRecord[]
): SpellRecord[] {
  const existingKeys = existingKeySet(existingSpells);
  const newSpells: SpellRecord[] = [];
  const { circleBases, primaryRunes, modifierRunes } = runeLists;

  for (const primary of primaryRunes) {
    for (const circleBase of circleBases) {
      const addIfNew = (mods: string[], control: string | null) => {
        const key = canonicalKey(circleBase, primary, mods, control);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, mods, control));
          existingKeys.add(key);
        }
      };

      addIfNew([], newControl);
      for (const m of modifierRunes) addIfNew([m], newControl);
    }
  }

  return newSpells;
}

export function calculatePrimaryCombinationCount(
  runeLists: RuneLists,
  newPrimary: string,
  existingSpells: SpellRecord[]
): number {
  return generateForNewPrimary(runeLists, newPrimary, existingSpells).length;
}

export function calculateModifierCombinationCount(
  runeLists: RuneLists,
  newModifier: string,
  existingSpells: SpellRecord[]
): number {
  return generateForNewModifier(runeLists, newModifier, existingSpells).length;
}

export function calculateControlCombinationCount(
  runeLists: RuneLists,
  newControl: string,
  existingSpells: SpellRecord[]
): number {
  return generateForNewControl(runeLists, newControl, existingSpells).length;
}
