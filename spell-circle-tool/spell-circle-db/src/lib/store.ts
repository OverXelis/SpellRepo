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

export interface BatchRecord {
  id: string;
  type: RuneType;
  runeName: string;
  spellIds: string[];
  timestamp: number;
}

interface SpellStore {
  // Data
  spells: SpellCombination[];
  runeLists: RuneLists;
  batchHistory: BatchRecord[];

  // Actions
  addPrimaryRune: (runeName: string) => number;
  addModifierRune: (runeName: string) => number;
  addControlRune: (runeName: string) => number;
  addRune: (type: RuneType, runeName: string) => number;
  deleteSpell: (id: string) => void;
  clearAllSpells: () => void;
  undoLastBatch: () => BatchRecord | null;

  // Rune list management
  removePrimaryRune: (runeName: string) => void;
  removeModifierRune: (runeName: string) => void;
  removeControlRune: (runeName: string) => void;

  // Import/Export
  exportData: () => string;
  importData: (jsonString: string) => boolean;
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
      batchHistory: [],

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

        // Create batch record
        const batch: BatchRecord = {
          id: crypto.randomUUID(),
          type: 'primary',
          runeName: trimmed,
          spellIds: newSpells.map((s) => s.id),
          timestamp: Date.now(),
        };

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
          batchHistory: [...state.batchHistory, batch],
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

        // Create batch record
        const batch: BatchRecord = {
          id: crypto.randomUUID(),
          type: 'modifier',
          runeName: trimmed,
          spellIds: newSpells.map((s) => s.id),
          timestamp: Date.now(),
        };

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
          batchHistory: [...state.batchHistory, batch],
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

        // Create batch record
        const batch: BatchRecord = {
          id: crypto.randomUUID(),
          type: 'control',
          runeName: trimmed,
          spellIds: newSpells.map((s) => s.id),
          timestamp: Date.now(),
        };

        set({
          runeLists: updatedLists,
          spells: [...state.spells, ...newSpells],
          batchHistory: [...state.batchHistory, batch],
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
          batchHistory: [],
        });
      },

      undoLastBatch: () => {
        const state = get();
        if (state.batchHistory.length === 0) return null;

        const lastBatch = state.batchHistory[state.batchHistory.length - 1];
        const spellIdsToRemove = new Set(lastBatch.spellIds);

        // Remove the rune from the appropriate list if it was newly added
        let updatedLists = { ...state.runeLists };

        // Check if any remaining spells use this rune - if not, remove it from the list
        const remainingSpells = state.spells.filter((s) => !spellIdsToRemove.has(s.id));

        if (lastBatch.type === 'primary') {
          const stillUsed = remainingSpells.some((s) => s.primaryRune === lastBatch.runeName);
          if (!stillUsed) {
            updatedLists.primaryRunes = updatedLists.primaryRunes.filter(
              (r) => r !== lastBatch.runeName
            );
          }
        } else if (lastBatch.type === 'modifier') {
          const stillUsed = remainingSpells.some((s) =>
            s.modifierRunes.includes(lastBatch.runeName)
          );
          if (!stillUsed) {
            updatedLists.modifierRunes = updatedLists.modifierRunes.filter(
              (r) => r !== lastBatch.runeName
            );
          }
        } else if (lastBatch.type === 'control') {
          const stillUsed = remainingSpells.some((s) => s.controlRune === lastBatch.runeName);
          if (!stillUsed) {
            updatedLists.controlRunes = updatedLists.controlRunes.filter(
              (r) => r !== lastBatch.runeName
            );
          }
        }

        set({
          spells: remainingSpells,
          runeLists: updatedLists,
          batchHistory: state.batchHistory.slice(0, -1),
        });

        return lastBatch;
      },

      removePrimaryRune: (runeName: string) => {
        set((state) => ({
          runeLists: {
            ...state.runeLists,
            primaryRunes: state.runeLists.primaryRunes.filter((r) => r !== runeName),
          },
          spells: state.spells.filter((s) => s.primaryRune !== runeName),
        }));
      },

      removeModifierRune: (runeName: string) => {
        set((state) => ({
          runeLists: {
            ...state.runeLists,
            modifierRunes: state.runeLists.modifierRunes.filter((r) => r !== runeName),
          },
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
          spells: state.spells.filter((s) => s.controlRune !== runeName),
        }));
      },

      exportData: () => {
        const state = get();
        return JSON.stringify(
          {
            spells: state.spells,
            runeLists: state.runeLists,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
      },

      importData: (jsonString: string) => {
        try {
          const data = JSON.parse(jsonString);
          if (!data.spells || !data.runeLists) {
            return false;
          }
          set({
            spells: data.spells,
            runeLists: data.runeLists,
            batchHistory: [],
          });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'spell-circle-db',
    }
  )
);
