import type { SpellCombination, RuneNameConfig } from './types';
import { getModifierPairKey } from './types';

/**
 * Generates a display name for a spell based on its runes and the naming configuration.
 * If a customName is set on the spell, it takes priority over auto-generation.
 * 
 * Format: "{ModifierName(s)} {PrimaryName} ({ControlName})"
 * 
 * Examples:
 * - No modifier, no control: "Fireball"
 * - One modifier: "Empowered Fireball"
 * - Two modifiers: "Overwhelming Fireball" (from pair name)
 * - With control: "Empowered Fireball (Channeled)"
 */
export function generateSpellName(
  spell: SpellCombination,
  config: RuneNameConfig
): string {
  // If spell has a custom name set, use it instead of auto-generating
  if (spell.customName && spell.customName.trim()) {
    return spell.customName.trim();
  }

  const parts: string[] = [];

  // Get modifier portion
  if (spell.modifierRunes.length === 1) {
    const modName = config.modifierNames[spell.modifierRunes[0]] || spell.modifierRunes[0];
    parts.push(modName);
  } else if (spell.modifierRunes.length === 2) {
    const pairKey = getModifierPairKey(spell.modifierRunes[0], spell.modifierRunes[1]);
    const pairName = config.modifierPairNames[pairKey];
    if (pairName) {
      parts.push(pairName);
    } else {
      // Fallback: combine both modifier names
      const mod1Name = config.modifierNames[spell.modifierRunes[0]] || spell.modifierRunes[0];
      const mod2Name = config.modifierNames[spell.modifierRunes[1]] || spell.modifierRunes[1];
      parts.push(`${mod1Name} ${mod2Name}`);
    }
  }

  // Get primary rune name
  const primaryName = config.primaryNames[spell.primaryRune] || spell.primaryRune;
  parts.push(primaryName);

  // Build base name
  let name = parts.join(' ');

  // Add control suffix if present
  if (spell.controlRune) {
    const controlName = config.controlNames[spell.controlRune] || spell.controlRune;
    name += ` (${controlName})`;
  }

  return name;
}

/**
 * Get all possible modifier pair keys from a list of modifiers.
 * Useful for UI to show all pairs that need naming.
 */
export function getAllModifierPairKeys(modifiers: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < modifiers.length; i++) {
    for (let j = i + 1; j < modifiers.length; j++) {
      pairs.push(getModifierPairKey(modifiers[i], modifiers[j]));
    }
  }
  return pairs;
}

/**
 * Parse a modifier pair key back into its components.
 */
export function parseModifierPairKey(key: string): [string, string] {
  const parts = key.split('|');
  return [parts[0], parts[1]];
}

/**
 * Check if all runes have custom names configured.
 */
export function getNamingCompleteness(
  runeLists: {
    primaryRunes: string[];
    modifierRunes: string[];
    controlRunes: string[];
  },
  config: RuneNameConfig
): {
  primaryComplete: number;
  primaryTotal: number;
  modifierComplete: number;
  modifierTotal: number;
  pairComplete: number;
  pairTotal: number;
  controlComplete: number;
  controlTotal: number;
} {
  const primaryComplete = runeLists.primaryRunes.filter(r => config.primaryNames[r]).length;
  const modifierComplete = runeLists.modifierRunes.filter(r => config.modifierNames[r]).length;
  const controlComplete = runeLists.controlRunes.filter(r => config.controlNames[r]).length;

  const allPairs = getAllModifierPairKeys(runeLists.modifierRunes);
  const pairComplete = allPairs.filter(k => config.modifierPairNames[k]).length;

  return {
    primaryComplete,
    primaryTotal: runeLists.primaryRunes.length,
    modifierComplete,
    modifierTotal: runeLists.modifierRunes.length,
    pairComplete,
    pairTotal: allPairs.length,
    controlComplete,
    controlTotal: runeLists.controlRunes.length,
  };
}

