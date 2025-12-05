export interface SpellCombination {
  id: string;
  circleBase: string;
  primaryRune: string;
  modifierRunes: string[];
  controlRune: string | null;
  createdAt: number;
}

export type RuneType = 'primary' | 'modifier' | 'control';

export interface RuneLists {
  circleBases: string[];
  primaryRunes: string[];
  modifierRunes: string[];
  controlRunes: string[];
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
