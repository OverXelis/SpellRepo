import { nanoid } from 'nanoid';
import type { SpellCombination, RuneLists } from './types';

/**
 * Creates a canonical key for deduplication.
 * Modifiers are sorted alphabetically for consistent comparison.
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

/**
 * Creates a SpellCombination object.
 */
function createSpell(
  circleBase: string,
  primaryRune: string,
  modifiers: string[],
  control: string | null
): SpellCombination {
  return {
    id: nanoid(),
    circleBase,
    primaryRune,
    modifierRunes: [...modifiers].sort(),
    controlRune: control,
    createdAt: Date.now(),
  };
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
  existingSpells: SpellCombination[]
): SpellCombination[] {
  const existingKeys = new Set(
    existingSpells.map((s) =>
      canonicalKey(s.circleBase, s.primaryRune, s.modifierRunes, s.controlRune)
    )
  );

  const newSpells: SpellCombination[] = [];
  const { circleBases, modifierRunes, controlRunes } = runeLists;

  for (const circleBase of circleBases) {
    // 1) No modifier, no control
    {
      const key = canonicalKey(circleBase, newPrimary, [], null);
      if (!existingKeys.has(key)) {
        newSpells.push(createSpell(circleBase, newPrimary, [], null));
        existingKeys.add(key);
      }
    }

    // 2) Single modifiers
    for (const m of modifierRunes) {
      const key = canonicalKey(circleBase, newPrimary, [m], null);
      if (!existingKeys.has(key)) {
        newSpells.push(createSpell(circleBase, newPrimary, [m], null));
        existingKeys.add(key);
      }
    }

    // 3) Modifier pairs (unordered)
    for (let i = 0; i < modifierRunes.length; i++) {
      for (let j = i + 1; j < modifierRunes.length; j++) {
        const m1 = modifierRunes[i];
        const m2 = modifierRunes[j];
        const key = canonicalKey(circleBase, newPrimary, [m1, m2], null);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, newPrimary, [m1, m2], null));
          existingKeys.add(key);
        }
      }
    }

    // 4) Control only
    for (const c of controlRunes) {
      const key = canonicalKey(circleBase, newPrimary, [], c);
      if (!existingKeys.has(key)) {
        newSpells.push(createSpell(circleBase, newPrimary, [], c));
        existingKeys.add(key);
      }
    }

    // 5) Modifier plus control
    for (const m of modifierRunes) {
      for (const c of controlRunes) {
        const key = canonicalKey(circleBase, newPrimary, [m], c);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, newPrimary, [m], c));
          existingKeys.add(key);
        }
      }
    }
  }

  return newSpells;
}

/**
 * Generate combinations for a new Modifier Rune.
 * Adds combinations involving the new modifier across all existing primaries.
 */
export function generateForNewModifier(
  runeLists: RuneLists,
  newModifier: string,
  existingSpells: SpellCombination[]
): SpellCombination[] {
  const existingKeys = new Set(
    existingSpells.map((s) =>
      canonicalKey(s.circleBase, s.primaryRune, s.modifierRunes, s.controlRune)
    )
  );

  const newSpells: SpellCombination[] = [];
  const { circleBases, primaryRunes, modifierRunes, controlRunes } = runeLists;

  // Include the new modifier in the list for pairing
  const allModifiers = modifierRunes.includes(newModifier)
    ? modifierRunes
    : [...modifierRunes, newModifier];

  for (const primary of primaryRunes) {
    for (const circleBase of circleBases) {
      // A. Single modifier M_new, no control
      {
        const key = canonicalKey(circleBase, primary, [newModifier], null);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, [newModifier], null));
          existingKeys.add(key);
        }
      }

      // B. Modifier pairs [M_new, M_old] for each other modifier
      for (const mOld of allModifiers) {
        if (mOld === newModifier) continue;
        const key = canonicalKey(circleBase, primary, [newModifier, mOld], null);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, [newModifier, mOld], null));
          existingKeys.add(key);
        }
      }

      // C. Modifier plus control [M_new] + [C]
      for (const c of controlRunes) {
        const key = canonicalKey(circleBase, primary, [newModifier], c);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, [newModifier], c));
          existingKeys.add(key);
        }
      }
    }
  }

  return newSpells;
}

/**
 * Generate combinations for a new Control Rune.
 * Adds combinations involving the new control across all existing primaries.
 */
export function generateForNewControl(
  runeLists: RuneLists,
  newControl: string,
  existingSpells: SpellCombination[]
): SpellCombination[] {
  const existingKeys = new Set(
    existingSpells.map((s) =>
      canonicalKey(s.circleBase, s.primaryRune, s.modifierRunes, s.controlRune)
    )
  );

  const newSpells: SpellCombination[] = [];
  const { circleBases, primaryRunes, modifierRunes } = runeLists;

  for (const primary of primaryRunes) {
    for (const circleBase of circleBases) {
      // A. Control only [C_new], no modifiers
      {
        const key = canonicalKey(circleBase, primary, [], newControl);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, [], newControl));
          existingKeys.add(key);
        }
      }

      // B. Modifier plus control [M] + [C_new]
      for (const m of modifierRunes) {
        const key = canonicalKey(circleBase, primary, [m], newControl);
        if (!existingKeys.has(key)) {
          newSpells.push(createSpell(circleBase, primary, [m], newControl));
          existingKeys.add(key);
        }
      }
    }
  }

  return newSpells;
}

/**
 * Calculate how many combinations a new primary rune would generate.
 */
export function calculatePrimaryCombinationCount(runeLists: RuneLists): number {
  const { circleBases, modifierRunes, controlRunes } = runeLists;
  const numBases = circleBases.length;
  const numMods = modifierRunes.length;
  const numControls = controlRunes.length;

  // Per circle base:
  // 1 (none) + numMods (single mod) + C(numMods,2) (mod pairs) + numControls (control only) + numMods*numControls (mod+control)
  const modPairs = (numMods * (numMods - 1)) / 2;
  const perBase = 1 + numMods + modPairs + numControls + numMods * numControls;

  return numBases * perBase;
}

/**
 * Calculate how many combinations a new modifier rune would generate.
 */
export function calculateModifierCombinationCount(runeLists: RuneLists): number {
  const { circleBases, primaryRunes, modifierRunes, controlRunes } = runeLists;
  const numBases = circleBases.length;
  const numPrimaries = primaryRunes.length;
  const numMods = modifierRunes.length;
  const numControls = controlRunes.length;

  // Per primary per base:
  // 1 (single new mod) + numMods (pair with each existing mod) + numControls (new mod + each control)
  const perPrimaryPerBase = 1 + numMods + numControls;

  return numBases * numPrimaries * perPrimaryPerBase;
}

/**
 * Calculate how many combinations a new control rune would generate.
 */
export function calculateControlCombinationCount(runeLists: RuneLists): number {
  const { circleBases, primaryRunes, modifierRunes } = runeLists;
  const numBases = circleBases.length;
  const numPrimaries = primaryRunes.length;
  const numMods = modifierRunes.length;

  // Per primary per base:
  // 1 (control only) + numMods (each mod + new control)
  const perPrimaryPerBase = 1 + numMods;

  return numBases * numPrimaries * perPrimaryPerBase;
}
