'use client';

import { create } from 'zustand';
import type { SpellCombination, RuneLists, RuneType, RuneNameConfig, SpellStatus } from './types';
import {
  DEFAULT_CIRCLE_BASES,
  DEFAULT_MODIFIER_RUNES,
  DEFAULT_CONTROL_RUNES,
  DEFAULT_TAGS,
  DEFAULT_RUNE_NAME_CONFIG,
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
  availableTags: string[];
  runeNameConfig: RuneNameConfig;
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
  removePrimaryRune: (runeName: string) => Promise<number>;
  removeModifierRune: (runeName: string) => Promise<number>;
  removeControlRune: (runeName: string) => Promise<number>;
  editRune: (type: RuneType, oldName: string, newName: string) => Promise<void>;

  // Spell management
  updateSpellTags: (spellId: string, tags: string[]) => Promise<void>;
  updateSpellStatus: (spellId: string, status: SpellStatus) => Promise<void>;

  // Tags management
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;

  // Naming config
  updateRuneNameConfig: (config: RuneNameConfig) => Promise<void>;
  updatePrimaryName: (rune: string, displayName: string) => Promise<void>;
  updateModifierName: (rune: string, displayName: string) => Promise<void>;
  updateModifierPairName: (pairKey: string, displayName: string) => Promise<void>;
  updateControlName: (rune: string, displayName: string) => Promise<void>;

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
  availableTags: DEFAULT_TAGS,
  runeNameConfig: DEFAULT_RUNE_NAME_CONFIG,
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
        availableTags: data.availableTags,
        runeNameConfig: data.runeNameConfig,
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
      availableTags: DEFAULT_TAGS,
      runeNameConfig: DEFAULT_RUNE_NAME_CONFIG,
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

    // Also remove from naming config
    const updatedConfig = { ...state.runeNameConfig };
    delete updatedConfig.primaryNames[runeName];

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => s.primaryRune !== runeName),
      runeNameConfig: updatedConfig,
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.updateRuneNameConfig(updatedConfig),
    ]);

    return spellsToRemove.length;
  },

  removeModifierRune: async (runeName: string) => {
    const state = get();
    const spellsToRemove = state.spells.filter((s) => s.modifierRunes.includes(runeName));
    const updatedLists = {
      ...state.runeLists,
      modifierRunes: state.runeLists.modifierRunes.filter((r) => r !== runeName),
    };

    // Also remove from naming config (single and pairs)
    const updatedConfig = { ...state.runeNameConfig };
    delete updatedConfig.modifierNames[runeName];
    // Remove all pairs containing this modifier
    const newPairNames: Record<string, string> = {};
    for (const [key, value] of Object.entries(updatedConfig.modifierPairNames)) {
      if (!key.includes(runeName)) {
        newPairNames[key] = value;
      }
    }
    updatedConfig.modifierPairNames = newPairNames;

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => !s.modifierRunes.includes(runeName)),
      runeNameConfig: updatedConfig,
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.updateRuneNameConfig(updatedConfig),
    ]);

    return spellsToRemove.length;
  },

  removeControlRune: async (runeName: string) => {
    const state = get();
    const spellsToRemove = state.spells.filter((s) => s.controlRune === runeName);
    const updatedLists = {
      ...state.runeLists,
      controlRunes: state.runeLists.controlRunes.filter((r) => r !== runeName),
    };

    // Also remove from naming config
    const updatedConfig = { ...state.runeNameConfig };
    delete updatedConfig.controlNames[runeName];

    set({
      runeLists: updatedLists,
      spells: state.spells.filter((s) => s.controlRune !== runeName),
      runeNameConfig: updatedConfig,
    });

    await Promise.all([
      dbOperations.deleteSpells(spellsToRemove.map((s) => s.id)),
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.updateRuneNameConfig(updatedConfig),
    ]);

    return spellsToRemove.length;
  },

  editRune: async (type: RuneType, oldName: string, newName: string) => {
    const state = get();
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;

    let updatedLists = { ...state.runeLists };
    let updatedSpells = [...state.spells];
    let updatedConfig = { ...state.runeNameConfig };

    if (type === 'primary') {
      updatedLists.primaryRunes = updatedLists.primaryRunes.map(r => 
        r === oldName ? trimmedNew : r
      );
      updatedSpells = updatedSpells.map(s => 
        s.primaryRune === oldName ? { ...s, primaryRune: trimmedNew } : s
      );
      // Update naming config
      if (updatedConfig.primaryNames[oldName]) {
        updatedConfig.primaryNames[trimmedNew] = updatedConfig.primaryNames[oldName];
        delete updatedConfig.primaryNames[oldName];
      }
    } else if (type === 'modifier') {
      updatedLists.modifierRunes = updatedLists.modifierRunes.map(r => 
        r === oldName ? trimmedNew : r
      );
      updatedSpells = updatedSpells.map(s => ({
        ...s,
        modifierRunes: s.modifierRunes.map(m => m === oldName ? trimmedNew : m).sort(),
      }));
      // Update naming config
      if (updatedConfig.modifierNames[oldName]) {
        updatedConfig.modifierNames[trimmedNew] = updatedConfig.modifierNames[oldName];
        delete updatedConfig.modifierNames[oldName];
      }
      // Update pair names
      const newPairNames: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedConfig.modifierPairNames)) {
        const newKey = key.split('|').map(m => m === oldName ? trimmedNew : m).sort().join('|');
        newPairNames[newKey] = value;
      }
      updatedConfig.modifierPairNames = newPairNames;
    } else if (type === 'control') {
      updatedLists.controlRunes = updatedLists.controlRunes.map(r => 
        r === oldName ? trimmedNew : r
      );
      updatedSpells = updatedSpells.map(s => 
        s.controlRune === oldName ? { ...s, controlRune: trimmedNew } : s
      );
      // Update naming config
      if (updatedConfig.controlNames[oldName]) {
        updatedConfig.controlNames[trimmedNew] = updatedConfig.controlNames[oldName];
        delete updatedConfig.controlNames[oldName];
      }
    }

    set({
      runeLists: updatedLists,
      spells: updatedSpells,
      runeNameConfig: updatedConfig,
    });

    await Promise.all([
      dbOperations.updateRuneLists(updatedLists),
      dbOperations.updateSpells(updatedSpells),
      dbOperations.updateRuneNameConfig(updatedConfig),
    ]);
  },

  // Spell management
  updateSpellTags: async (spellId: string, tags: string[]) => {
    const state = get();
    const spell = state.spells.find(s => s.id === spellId);
    if (!spell) return;

    const updatedSpell = { ...spell, tags };
    set({
      spells: state.spells.map(s => s.id === spellId ? updatedSpell : s),
    });

    await dbOperations.updateSpell(updatedSpell);
  },

  updateSpellStatus: async (spellId: string, status: SpellStatus) => {
    const state = get();
    const spell = state.spells.find(s => s.id === spellId);
    if (!spell) return;

    const updatedSpell = { ...spell, status };
    set({
      spells: state.spells.map(s => s.id === spellId ? updatedSpell : s),
    });

    await dbOperations.updateSpell(updatedSpell);
  },

  // Tags management
  addTag: async (tag: string) => {
    const state = get();
    const trimmed = tag.trim();
    if (!trimmed || state.availableTags.includes(trimmed)) return;

    const updatedTags = [...state.availableTags, trimmed];
    set({ availableTags: updatedTags });
    await dbOperations.updateAvailableTags(updatedTags);
  },

  removeTag: async (tag: string) => {
    const state = get();
    const updatedTags = state.availableTags.filter(t => t !== tag);
    
    // Also remove this tag from all spells that have it
    const updatedSpells = state.spells.map(s => ({
      ...s,
      tags: s.tags.filter(t => t !== tag),
    }));

    set({ 
      availableTags: updatedTags,
      spells: updatedSpells,
    });

    await Promise.all([
      dbOperations.updateAvailableTags(updatedTags),
      dbOperations.updateSpells(updatedSpells),
    ]);
  },

  // Naming config
  updateRuneNameConfig: async (config: RuneNameConfig) => {
    set({ runeNameConfig: config });
    await dbOperations.updateRuneNameConfig(config);
  },

  updatePrimaryName: async (rune: string, displayName: string) => {
    const state = get();
    const updatedConfig = {
      ...state.runeNameConfig,
      primaryNames: {
        ...state.runeNameConfig.primaryNames,
        [rune]: displayName,
      },
    };
    if (!displayName) {
      delete updatedConfig.primaryNames[rune];
    }
    set({ runeNameConfig: updatedConfig });
    await dbOperations.updateRuneNameConfig(updatedConfig);
  },

  updateModifierName: async (rune: string, displayName: string) => {
    const state = get();
    const updatedConfig = {
      ...state.runeNameConfig,
      modifierNames: {
        ...state.runeNameConfig.modifierNames,
        [rune]: displayName,
      },
    };
    if (!displayName) {
      delete updatedConfig.modifierNames[rune];
    }
    set({ runeNameConfig: updatedConfig });
    await dbOperations.updateRuneNameConfig(updatedConfig);
  },

  updateModifierPairName: async (pairKey: string, displayName: string) => {
    const state = get();
    const updatedConfig = {
      ...state.runeNameConfig,
      modifierPairNames: {
        ...state.runeNameConfig.modifierPairNames,
        [pairKey]: displayName,
      },
    };
    if (!displayName) {
      delete updatedConfig.modifierPairNames[pairKey];
    }
    set({ runeNameConfig: updatedConfig });
    await dbOperations.updateRuneNameConfig(updatedConfig);
  },

  updateControlName: async (rune: string, displayName: string) => {
    const state = get();
    const updatedConfig = {
      ...state.runeNameConfig,
      controlNames: {
        ...state.runeNameConfig.controlNames,
        [rune]: displayName,
      },
    };
    if (!displayName) {
      delete updatedConfig.controlNames[rune];
    }
    set({ runeNameConfig: updatedConfig });
    await dbOperations.updateRuneNameConfig(updatedConfig);
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
        availableTags: data.availableTags,
        runeNameConfig: data.runeNameConfig,
      });
    }
    return success;
  },
}));
