export type SpellStatus = 'normal' | 'favorite' | 'dud';

export interface SpellCombination {
  id: string;
  circleBase: string;
  primaryRune: string;
  modifierRunes: string[];
  controlRune: string | null;
  createdAt: number;
  tags: string[];
  status: SpellStatus;
  description?: string;
  customName?: string;
}

export type RuneType = 'primary' | 'modifier' | 'control';

export interface RuneLists {
  circleBases: string[];
  primaryRunes: string[];
  modifierRunes: string[];
  controlRunes: string[];
}

export interface RuneNameConfig {
  primaryNames: Record<string, string>;      // "Fire" → "Fireball"
  modifierNames: Record<string, string>;     // "Empower" → "Empowered"
  modifierPairNames: Record<string, string>; // "Empower|Extend" → "Overwhelming"
  controlNames: Record<string, string>;      // "Channeling" → "Channeled"
}

export interface AppConfig {
  availableTags: string[];
  runeNameConfig: RuneNameConfig;
}

export const DEFAULT_CIRCLE_BASES = [
  'Targeted',
  'Directional',
  'Area',
  'Trap',
  'Alteration',
];

export const DEFAULT_MODIFIER_RUNES = [
  'Empower',
  'Extend',
  'Exempt',
  'Anchor_M',
];

export const DEFAULT_CONTROL_RUNES = [
  'Draining',
  'Activation',
  'Channeling',
];

export const DEFAULT_TAGS = [
  'Combat',
  'Utility',
  'Support',
  'Enchanting',
];

export const DEFAULT_RUNE_NAME_CONFIG: RuneNameConfig = {
  primaryNames: {},
  modifierNames: {},
  modifierPairNames: {},
  controlNames: {},
};

// Helper to create a canonical key for modifier pairs (sorted alphabetically)
export function getModifierPairKey(mod1: string, mod2: string): string {
  const sorted = [mod1, mod2].sort();
  return `${sorted[0]}|${sorted[1]}`;
}
