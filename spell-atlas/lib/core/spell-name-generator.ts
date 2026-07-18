import type { RuneNameConfig, SpellRecord } from './types';
import { getModifierPairKey } from './types';

/**
 * Generates a display name for a spell based on its runes and the naming
 * configuration. Ported unchanged from the original spell-circle-db app.
 *
 * Format: "{ModifierName(s)} {PrimaryName} ({ControlName})"
 */
export function generateSpellName(
  spell: Pick<SpellRecord, 'modifierRunes' | 'primaryRune' | 'controlRune' | 'customName'>,
  config: RuneNameConfig
): string {
  if (spell.customName && spell.customName.trim()) {
    return spell.customName.trim();
  }

  const parts: string[] = [];

  if (spell.modifierRunes.length === 1) {
    const modName = config.modifierNames[spell.modifierRunes[0]] || spell.modifierRunes[0];
    parts.push(modName);
  } else if (spell.modifierRunes.length === 2) {
    const pairKey = getModifierPairKey(spell.modifierRunes[0], spell.modifierRunes[1]);
    const pairName = config.modifierPairNames[pairKey];
    if (pairName) {
      parts.push(pairName);
    } else {
      const mod1Name = config.modifierNames[spell.modifierRunes[0]] || spell.modifierRunes[0];
      const mod2Name = config.modifierNames[spell.modifierRunes[1]] || spell.modifierRunes[1];
      parts.push(`${mod1Name} ${mod2Name}`);
    }
  }

  const primaryName = config.primaryNames[spell.primaryRune] || spell.primaryRune;
  parts.push(primaryName);

  let name = parts.join(' ');

  if (spell.controlRune) {
    const controlName = config.controlNames[spell.controlRune] || spell.controlRune;
    name += ` (${controlName})`;
  }

  return name;
}

export function getAllModifierPairKeys(modifiers: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < modifiers.length; i++) {
    for (let j = i + 1; j < modifiers.length; j++) {
      pairs.push(getModifierPairKey(modifiers[i], modifiers[j]));
    }
  }
  return pairs;
}

export function parseModifierPairKey(key: string): [string, string] {
  const parts = key.split('|');
  return [parts[0], parts[1]];
}
