import Dexie, { type EntityTable } from 'dexie';
import type { SpellCombination, RuneLists, RuneNameConfig, SpellStatus } from './types';
import {
  DEFAULT_CIRCLE_BASES,
  DEFAULT_MODIFIER_RUNES,
  DEFAULT_CONTROL_RUNES,
  DEFAULT_TAGS,
  DEFAULT_RUNE_NAME_CONFIG,
} from './types';

// Batch record for undo functionality
export interface BatchRecord {
  id: string;
  type: 'primary' | 'modifier' | 'control';
  runeName: string;
  spellIds: string[];
  timestamp: number;
}

// Rune Lists config stored in IndexedDB
export interface RuneListsConfig {
  id: string;
  runeLists: RuneLists;
}

// App settings stored in IndexedDB
export interface AppSettings {
  id: string;
  availableTags: string[];
  runeNameConfig: RuneNameConfig;
}

// Define the database
const db = new Dexie('SpellCircleDB') as Dexie & {
  spells: EntityTable<SpellCombination, 'id'>;
  batchHistory: EntityTable<BatchRecord, 'id'>;
  config: EntityTable<RuneListsConfig, 'id'>;
  appSettings: EntityTable<AppSettings, 'id'>;
};

// Schema definition - version 2 adds tags, status to spells and appSettings table
db.version(1).stores({
  spells: 'id, circleBase, primaryRune, createdAt',
  batchHistory: 'id, timestamp',
  config: 'id',
});

db.version(2).stores({
  spells: 'id, circleBase, primaryRune, createdAt, status',
  batchHistory: 'id, timestamp',
  config: 'id',
  appSettings: 'id',
}).upgrade(async tx => {
  // Migrate existing spells to have default tags and status
  await tx.table('spells').toCollection().modify(spell => {
    if (!spell.tags) spell.tags = [];
    if (!spell.status) spell.status = 'normal';
  });
});

// Default configs
const DEFAULT_RUNE_LISTS_CONFIG: RuneListsConfig = {
  id: 'main',
  runeLists: {
    circleBases: DEFAULT_CIRCLE_BASES,
    primaryRunes: [],
    modifierRunes: DEFAULT_MODIFIER_RUNES,
    controlRunes: DEFAULT_CONTROL_RUNES,
  },
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'main',
  availableTags: DEFAULT_TAGS,
  runeNameConfig: DEFAULT_RUNE_NAME_CONFIG,
};

// Database operations
export const dbOperations = {
  // Initialize database with defaults if empty
  async initialize(): Promise<{
    spells: SpellCombination[];
    runeLists: RuneLists;
    batchHistory: BatchRecord[];
    availableTags: string[];
    runeNameConfig: RuneNameConfig;
  }> {
    let config = await db.config.get('main');
    if (!config) {
      await db.config.put(DEFAULT_RUNE_LISTS_CONFIG);
      config = DEFAULT_RUNE_LISTS_CONFIG;
    }

    let appSettings = await db.appSettings.get('main');
    if (!appSettings) {
      await db.appSettings.put(DEFAULT_APP_SETTINGS);
      appSettings = DEFAULT_APP_SETTINGS;
    }

    const spells = await db.spells.toArray();
    const batchHistory = await db.batchHistory.orderBy('timestamp').toArray();

    // Ensure all spells have tags and status (migration safety)
    const migratedSpells = spells.map(spell => ({
      ...spell,
      tags: spell.tags ?? [],
      status: spell.status ?? 'normal' as SpellStatus,
    }));

    return {
      spells: migratedSpells,
      runeLists: config.runeLists,
      batchHistory,
      availableTags: appSettings.availableTags,
      runeNameConfig: appSettings.runeNameConfig,
    };
  },

  // Spells
  async addSpells(spells: SpellCombination[]): Promise<void> {
    await db.spells.bulkPut(spells);
  },

  async updateSpell(spell: SpellCombination): Promise<void> {
    await db.spells.put(spell);
  },

  async updateSpells(spells: SpellCombination[]): Promise<void> {
    await db.spells.bulkPut(spells);
  },

  async deleteSpell(id: string): Promise<void> {
    await db.spells.delete(id);
  },

  async deleteSpells(ids: string[]): Promise<void> {
    await db.spells.bulkDelete(ids);
  },

  async clearAllSpells(): Promise<void> {
    await db.spells.clear();
  },

  async getAllSpells(): Promise<SpellCombination[]> {
    return db.spells.toArray();
  },

  // Rune Lists / Config
  async updateRuneLists(runeLists: RuneLists): Promise<void> {
    await db.config.put({ id: 'main', runeLists });
  },

  async getRuneLists(): Promise<RuneLists> {
    const config = await db.config.get('main');
    return config?.runeLists ?? DEFAULT_RUNE_LISTS_CONFIG.runeLists;
  },

  // App Settings (tags and naming config)
  async updateAvailableTags(tags: string[]): Promise<void> {
    const settings = await db.appSettings.get('main') ?? DEFAULT_APP_SETTINGS;
    await db.appSettings.put({ ...settings, availableTags: tags });
  },

  async updateRuneNameConfig(config: RuneNameConfig): Promise<void> {
    const settings = await db.appSettings.get('main') ?? DEFAULT_APP_SETTINGS;
    await db.appSettings.put({ ...settings, runeNameConfig: config });
  },

  async getAppSettings(): Promise<AppSettings> {
    const settings = await db.appSettings.get('main');
    return settings ?? DEFAULT_APP_SETTINGS;
  },

  // Batch History
  async addBatch(batch: BatchRecord): Promise<void> {
    await db.batchHistory.put(batch);
  },

  async removeBatch(id: string): Promise<void> {
    await db.batchHistory.delete(id);
  },

  async clearBatchHistory(): Promise<void> {
    await db.batchHistory.clear();
  },

  async getBatchHistory(): Promise<BatchRecord[]> {
    return db.batchHistory.orderBy('timestamp').toArray();
  },

  // Clear everything and reset to defaults
  async resetAll(): Promise<void> {
    await db.spells.clear();
    await db.batchHistory.clear();
    await db.config.put(DEFAULT_RUNE_LISTS_CONFIG);
    await db.appSettings.put(DEFAULT_APP_SETTINGS);
  },

  // Export all data as JSON string
  async exportAll(): Promise<string> {
    const spells = await db.spells.toArray();
    const config = await db.config.get('main');
    const appSettings = await db.appSettings.get('main');
    return JSON.stringify(
      {
        spells,
        runeLists: config?.runeLists ?? DEFAULT_RUNE_LISTS_CONFIG.runeLists,
        availableTags: appSettings?.availableTags ?? DEFAULT_TAGS,
        runeNameConfig: appSettings?.runeNameConfig ?? DEFAULT_RUNE_NAME_CONFIG,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },

  // Import data from JSON string
  async importAll(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.spells || !data.runeLists) {
        return false;
      }

      // Clear existing data
      await db.spells.clear();
      await db.batchHistory.clear();

      // Ensure imported spells have required fields
      const migratedSpells = data.spells.map((spell: SpellCombination) => ({
        ...spell,
        tags: spell.tags ?? [],
        status: spell.status ?? 'normal',
      }));

      // Import new data
      await db.spells.bulkPut(migratedSpells);
      await db.config.put({ id: 'main', runeLists: data.runeLists });
      
      // Import app settings if present
      if (data.availableTags || data.runeNameConfig) {
        const currentSettings = await db.appSettings.get('main') ?? DEFAULT_APP_SETTINGS;
        await db.appSettings.put({
          id: 'main',
          availableTags: data.availableTags ?? currentSettings.availableTags,
          runeNameConfig: data.runeNameConfig ?? currentSettings.runeNameConfig,
        });
      }

      return true;
    } catch {
      return false;
    }
  },
};

export { db };
