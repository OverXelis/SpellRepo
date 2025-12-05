import Dexie, { type EntityTable } from 'dexie';
import type { SpellCombination, RuneLists } from './types';
import {
  DEFAULT_CIRCLE_BASES,
  DEFAULT_MODIFIER_RUNES,
  DEFAULT_CONTROL_RUNES,
} from './types';

// Batch record for undo functionality
export interface BatchRecord {
  id: string;
  type: 'primary' | 'modifier' | 'control';
  runeName: string;
  spellIds: string[];
  timestamp: number;
}

// App settings/config stored in IndexedDB
export interface AppConfig {
  id: string;
  runeLists: RuneLists;
}

// Define the database
const db = new Dexie('SpellCircleDB') as Dexie & {
  spells: EntityTable<SpellCombination, 'id'>;
  batchHistory: EntityTable<BatchRecord, 'id'>;
  config: EntityTable<AppConfig, 'id'>;
};

// Schema definition
db.version(1).stores({
  spells: 'id, circleBase, primaryRune, createdAt',
  batchHistory: 'id, timestamp',
  config: 'id',
});

// Default config
const DEFAULT_CONFIG: AppConfig = {
  id: 'main',
  runeLists: {
    circleBases: DEFAULT_CIRCLE_BASES,
    primaryRunes: [],
    modifierRunes: DEFAULT_MODIFIER_RUNES,
    controlRunes: DEFAULT_CONTROL_RUNES,
  },
};

// Database operations
export const dbOperations = {
  // Initialize database with defaults if empty
  async initialize(): Promise<{
    spells: SpellCombination[];
    runeLists: RuneLists;
    batchHistory: BatchRecord[];
  }> {
    let config = await db.config.get('main');
    if (!config) {
      await db.config.put(DEFAULT_CONFIG);
      config = DEFAULT_CONFIG;
    }

    const spells = await db.spells.toArray();
    const batchHistory = await db.batchHistory.orderBy('timestamp').toArray();

    return {
      spells,
      runeLists: config.runeLists,
      batchHistory,
    };
  },

  // Spells
  async addSpells(spells: SpellCombination[]): Promise<void> {
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
    return config?.runeLists ?? DEFAULT_CONFIG.runeLists;
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
    await db.config.put(DEFAULT_CONFIG);
  },

  // Export all data as JSON string
  async exportAll(): Promise<string> {
    const spells = await db.spells.toArray();
    const config = await db.config.get('main');
    return JSON.stringify(
      {
        spells,
        runeLists: config?.runeLists ?? DEFAULT_CONFIG.runeLists,
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

      // Import new data
      await db.spells.bulkPut(data.spells);
      await db.config.put({ id: 'main', runeLists: data.runeLists });

      return true;
    } catch {
      return false;
    }
  },
};

export { db };

