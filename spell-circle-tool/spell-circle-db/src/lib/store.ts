'use client';

import { create } from 'zustand';
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
import { dbOperations, type BatchRecord } from './db';

interface SpellStore {
  // Data
  spells: SpellCombination[];
  runeLists: RuneLists;
  batchHistory: BatchRecord[];
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  addPrimaryRune: (runeName: string) => Promise<number>;
  addModifierRune: (runeName: string) => Promise<number>;
  addControlRune: (runeName: string) => Promise<number>;
  addRune: (type: RuneType, runeName: string) => Promise<number>;
  deleteSpell: (id: string) => Promise<void>;
  clearAllSpells: () => Promise<void>;
  undoLastBatch: () => Promise<BatchRecord | null>;

  // Rune list management
  removePrimaryRune: (runeName: string) => Promise<void>;
  removeModifierRune: (runeName: string) => Promise<void>;
  removeControlRune: (runeName: string) => Promise<void>;

  // Import/Export
  exportData: () => Promise<string>;
  importData: (jsonString: string) => Promise<boolean>;
}

export type { BatchRecord };

export const useSpellStore = create<SpellStore>()((set, get) => ({
  spells: [],
  runeLists: {
    circleBases: DEFAULT_CIRCLE_BASES,
    primaryRunes: [],
    modifierRunes: DEFAULT_MODIFIER_RUNES,
    controlRunes: DEFAULT_CONTROL_RUNES,
  },
  batchHistory: [],
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    
    try {
      const data = await dbOperations.initialize();
      set({
        spells: data.spells,
        runeLists: data.runeLists,
        batchHistory: data.batchHistory,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      console.error('Failed to initialize database:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  addPrimaryRune: async (runeName: string) => {
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

    // Update state immediately for responsive UI
    set({
      runeLists: updatedLists,
      spells: [...state.spells, ...newSpells],
      batchHistory: [...state.batchHistory, batch],
    });

    // Persist to IndexedDB
    await Promise.all([
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.addSpells(newSpells),
      dbOperations.addBatch(batch),
    ]);

    return newSpells.length;
  },

  addModifierRune: async (runeName: string) => {
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

    // Update state immediately for responsive UI
    set({
      runeLists: updatedLists,
      spells: [...state.spells, ...newSpells],
      batchHistory: [...state.batchHistory, batch],
    });

    // Persist to IndexedDB
    await Promise.all([
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.addSpells(newSpells),
      dbOperations.addBatch(batch),
    ]);

    return newSpells.length;
  },

  addControlRune: async (runeName: string) => {
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

    // Update state immediately for responsive UI
    set({
      runeLists: updatedLists,
      spells: [...state.spells, ...newSpells],
      batchHistory: [...state.batchHistory, batch],
    });

    // Persist to IndexedDB
    await Promise.all([
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.addSpells(newSpells),
      dbOperations.addBatch(batch),
    ]);

    return newSpells.length;
  },

  addRune: async (type: RuneType, runeName: string) => {
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

  deleteSpell: async (id: string) => {
    set((state) => ({
      spells: state.spells.filter((s) => s.id !== id),
    }));
    await dbOperations.deleteSpell(id);
  },

  clearAllSpells: async () => {
    const defaultLists = {
      circleBases: DEFAULT_CIRCLE_BASES,
      primaryRunes: [],
      modifierRunes: DEFAULT_MODIFIER_RUNES,
      controlRunes: DEFAULT_CONTROL_RUNES,
    };

    set({
      spells: [],
      runeLists: defaultLists,
      batchHistory: [],
    });

    await dbOperations.resetAll();
  },

  undoLastBatch: async () => {
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

    // Update state
    set({
      spells: remainingSpells,
      runeLists: updatedLists,
      batchHistory: state.batchHistory.slice(0, -1),
    });

    // Persist to IndexedDB
    await Promise.all([
      dbOperations.deleteSpells(lastBatch.spellIds),
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.removeBatch(lastBatch.id),
    ]);

    return lastBatch;
  },

  removePrimaryRune: async (runeName: string) => {
    const state = get();
    const spellsToRemove = state.spells.filter((s) => s.primaryRune === runeName);
    const updatedLists = {
      ...state.runeLists,
      primaryRunes: state.runeLists.primaryRunes.filter((r) => r !== runeName),
    };

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => s.primaryRune !== runeName),
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
    ]);
  },

  removeModifierRune: async (runeName: string) => {
    const state = get();
    const spellsToRemove = state.spells.filter((s) => s.modifierRunes.includes(runeName));
    const updatedLists = {
      ...state.runeLists,
      modifierRunes: state.runeLists.modifierRunes.filter((r) => r !== runeName),
    };

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => !s.modifierRunes.includes(runeName)),
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
    ]);
  },

  removeControlRune: async (runeName: string) => {
    const state = get();
    const spellsToRemove = state.spells.filter((s) => s.controlRune === runeName);
    const updatedLists = {
      ...state.runeLists,
      controlRunes: state.runeLists.controlRunes.filter((r) => r !== runeName),
    };

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => s.controlRune !== runeName),
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
    ]);
  },

  exportData: async () => {
    return dbOperations.exportAll();
  },

  importData: async (jsonString: string) => {
    const success = await dbOperations.importAll(jsonString);
    if (success) {
      // Reload state from database
      const data = await dbOperations.initialize();
      set({
        spells: data.spells,
        runeLists: data.runeLists,
        batchHistory: [],
      });
    }
    return success;
  },
}));
