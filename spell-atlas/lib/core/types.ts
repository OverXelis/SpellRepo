// Domain types for the spell/rune system. Mechanics are unchanged from the
// original spell-circle-db app: a spell = circleBase x primaryRune x
// modifierRunes[0-2] x controlRune[0-1].

export type SpellStatus = 'normal' | 'favorite' | 'dud';
export type RuneKind = 'circleBase' | 'primary' | 'modifier' | 'control';

export interface SpellRecord {
  id: string;
  circleBase: string;
  primaryRune: string;
  modifierRunes: string[]; // 0, 1, or 2 entries, always stored sorted
  controlRune: string | null;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  status: SpellStatus;
  description: string;
  customName: string;
  summary: string;
}

/** Compact shape returned by search results, so the AI chat never has to
 * pull full descriptions for spells it hasn't decided are relevant yet. */
export interface SpellSummaryRecord {
  id: string;
  name: string;
  circleBase: string;
  primaryRune: string;
  modifierRunes: string[];
  controlRune: string | null;
  tags: string[];
  status: SpellStatus;
  summary: string;
}

export interface RuneLists {
  circleBases: string[];
  primaryRunes: string[];
  modifierRunes: string[];
  controlRunes: string[];
}

export interface RuneNameConfig {
  primaryNames: Record<string, string>;
  modifierNames: Record<string, string>;
  modifierPairNames: Record<string, string>;
  controlNames: Record<string, string>;
}

export interface TagInfo {
  name: string;
  category: string | null;
  count: number;
}

export const DEFAULT_CIRCLE_BASES = [
  'Targeted',
  'Directional',
  'Area',
  'Trap',
  'Alteration',
];

export const DEFAULT_MODIFIER_RUNES = ['Empower', 'Extend', 'Exempt', 'Anchor_M'];

export const DEFAULT_CONTROL_RUNES = ['Draining', 'Activation', 'Channeling'];

export const DEFAULT_TAGS = ['Combat', 'Utility', 'Support', 'Enchanting'];

export function getModifierPairKey(mod1: string, mod2: string): string {
  const sorted = [mod1, mod2].sort();
  return `${sorted[0]}|${sorted[1]}`;
}
