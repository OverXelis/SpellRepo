'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpellCombination, RuneLists, RuneType } from './types';
import {
  DEFAULT_CIRCLE_BASES,
  DEFAULT_MODIFIER_RUNES,
  DEFAULT_CONTROL_RUNES,
} from './types';
import {
  generateForNewPrimary,
  generateForNewModifier,
  generateForNewControl,
} from './rune-calculator';

interface SpellStore {
  // Data
  spells: SpellCombination[];
  runeLists: RuneLists;

  // Actions
  addPrimaryRune: (runeName: string) => number;
  addModifierRune: (runeName: string) => number;
  addControlRune: (runeName: string) => number;
  addRune: (type: RuneType, runeName: string) => number;
  deleteSpell: (id: string) => void;
  clearAllSpells: () => void;

  // Rune list management
  removePrimaryRune: (runeName: string) => void;
  removeModifierRune: (runeName: string) => void;
  removeControlRune: (runeName: string) => void;
}

export const useSpellStore = create<SpellStore>()(
  persist(
    (set, get) => ({
      spells: [],
      runeLists: {
        circleBases: DEFAULT_CIRCLE_BASES,
        primaryRunes: [],
        modifierRunes: DEFAULT_MODIFIER_RUNES,
        controlRunes: DEFAULT_CONTROL_RUNES,
      },

      addPrimaryRune: (runeName: string) => {
        const state = get();
        const trimmed = runeName.trim();

        if (!trimmed) return 0;

        // Add to primary runes list if not already there
        const updatedLists = {
          ...state.runeLists,
          primaryRunes: state.runeLists.primaryRunes.includes(trimmed)
            ? state.runeLists.primaryRunes
            : [...state.runeLists.primaryRunes, trimmed],
        };

        // Generate new combinations
        const newSpells = generateForNewPrimary(
          updatedLists,
          trimmed,
          state.spells
        );

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
        });

        return newSpells.length;
      },

      addModifierRune: (runeName: string) => {
        const state = get();
        const trimmed = runeName.trim();

        if (!trimmed) return 0;
        if (state.runeLists.primaryRunes.length === 0) return 0;

        // Add to modifier runes list if not already there
        const updatedLists = {
          ...state.runeLists,
          modifierRunes: state.runeLists.modifierRunes.includes(trimmed)
            ? state.runeLists.modifierRunes
            : [...state.runeLists.modifierRunes, trimmed],
        };

        // Generate new combinations
        const newSpells = generateForNewModifier(
          updatedLists,
          trimmed,
          state.spells
        );

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
        });

        return newSpells.length;
      },

      addControlRune: (runeName: string) => {
        const state = get();
        const trimmed = runeName.trim();

        if (!trimmed) return 0;
        if (state.runeLists.primaryRunes.length === 0) return 0;

        // Add to control runes list if not already there
        const updatedLists = {
          ...state.runeLists,
          controlRunes: state.runeLists.controlRunes.includes(trimmed)
            ? state.runeLists.controlRunes
            : [...state.runeLists.controlRunes, trimmed],
        };

        // Generate new combinations
        const newSpells = generateForNewControl(
          updatedLists,
          trimmed,
          state.spells
        );

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
        });

        return newSpells.length;
      },

      addRune: (type: RuneType, runeName: string) => {
        const state = get();
        switch (type) {
          case 'primary':
            return state.addPrimaryRune(runeName);
          case 'modifier':
            return state.addModifierRune(runeName);
          case 'control':
            return state.addControlRune(runeName);
          default:
            return 0;
        }
      },

      deleteSpell: (id: string) => {
        set((state) => ({
          spells: state.spells.filter((s) => s.id !== id),
        }));
      },

      clearAllSpells: () => {
        set({
          spells: [],
          runeLists: {
            circleBases: DEFAULT_CIRCLE_BASES,
            primaryRunes: [],
            modifierRunes: DEFAULT_MODIFIER_RUNES,
            controlRunes: DEFAULT_CONTROL_RUNES,
          },
        });
      },

      removePrimaryRune: (runeName: string) => {
        set((state) => ({
          runeLists: {
            ...state.runeLists,
            primaryRunes: state.runeLists.primaryRunes.filter((r) => r !== runeName),
          },
          // Also remove all spells with this primary rune
          spells: state.spells.filter((s) => s.primaryRune !== runeName),
        }));
      },

      removeModifierRune: (runeName: string) => {
        set((state) => ({
          runeLists: {
            ...state.runeLists,
            modifierRunes: state.runeLists.modifierRunes.filter((r) => r !== runeName),
          },
          // Remove spells that use this modifier
          spells: state.spells.filter(
            (s) => !s.modifierRunes.includes(runeName)
          ),
        }));
      },

      removeControlRune: (runeName: string) => {
        set((state) => ({
          runeLists: {
            ...state.runeLists,
            controlRunes: state.runeLists.controlRunes.filter((r) => r !== runeName),
          },
          // Remove spells that use this control
          spells: state.spells.filter((s) => s.controlRune !== runeName),
        }));
      },
    }),
    {
      name: 'spell-circle-db',
    }
  )
);
