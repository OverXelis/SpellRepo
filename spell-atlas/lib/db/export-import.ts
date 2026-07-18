import type Database from 'better-sqlite3';
import type { RuneKind, RuneLists, RuneMeaningConfig, RuneNameConfig, SpellRecord, SpellStatus } from '@/lib/core/types';
import { clearAllSpells, getSpellsByIds, getAllSpellIds, insertFullSpells } from '@/lib/db/spells';
import { getRuneLists, getRuneMeanings, getRuneNameConfig } from '@/lib/db/naming';
import { getAllTags } from '@/lib/db/tags';

export interface ExportPayload {
  spells: SpellRecord[];
  runeLists: RuneLists;
  availableTags: string[];
  /** Optional -- absent in exports from the original spell-circle-db app.
   * Maps tag name -> category, for tags that have one. */
  tagCategories?: Record<string, string>;
  runeNameConfig: RuneNameConfig;
  /** Optional -- absent in older exports. AI-context notes per rune. */
  runeMeanings?: RuneMeaningConfig;
  exportedAt: string;
}

export function exportAll(db: Database.Database): ExportPayload {
  const spells = getSpellsByIds(db, getAllSpellIds(db));
  const allTags = getAllTags(db);
  const tagCategories: Record<string, string> = {};
  for (const tag of allTags) {
    if (tag.category) tagCategories[tag.name] = tag.category;
  }
  return {
    spells,
    runeLists: getRuneLists(db),
    availableTags: allTags.map((t) => t.name),
    tagCategories,
    runeNameConfig: getRuneNameConfig(db),
    runeMeanings: getRuneMeanings(db),
    exportedAt: new Date().toISOString(),
  };
}

const RUNE_KINDS: RuneKind[] = ['circleBase', 'primary', 'modifier', 'control'];

/**
 * Imports a JSON payload in either this app's export format, or the
 * original spell-circle-db (Dexie) app's export format -- they're
 * structurally identical for our purposes. Replaces all existing data.
 */
export function importAll(db: Database.Database, jsonString: string): { success: boolean; error?: string } {
  let data: Partial<ExportPayload>;
  try {
    data = JSON.parse(jsonString);
  } catch {
    return { success: false, error: 'Invalid JSON' };
  }

  if (!data.spells || !Array.isArray(data.spells)) {
    return { success: false, error: 'No spells array found in import file' };
  }

  const tx = db.transaction(() => {
    clearAllSpells(db);
    db.exec('DELETE FROM runes');
    db.exec('DELETE FROM modifier_pair_names');
    db.exec('DELETE FROM tags');

    const runeLists = data.runeLists ?? { circleBases: [], primaryRunes: [], modifierRunes: [], controlRunes: [] };
    const namingConfig = data.runeNameConfig ?? {
      primaryNames: {},
      modifierNames: {},
      modifierPairNames: {},
      controlNames: {},
    };

    const meaningsConfig = data.runeMeanings ?? {
      circleBaseMeanings: {},
      primaryMeanings: {},
      modifierMeanings: {},
      controlMeanings: {},
    };

    const insertRune = db.prepare('INSERT OR IGNORE INTO runes (kind, name, display_name, meaning, sort_order) VALUES (?, ?, ?, ?, ?)');
    const kindLists: Record<RuneKind, string[]> = {
      circleBase: runeLists.circleBases ?? [],
      primary: runeLists.primaryRunes ?? [],
      modifier: runeLists.modifierRunes ?? [],
      control: runeLists.controlRunes ?? [],
    };
    for (const kind of RUNE_KINDS) {
      kindLists[kind].forEach((name, i) => {
        let displayName = '';
        let meaning = '';
        if (kind === 'primary') {
          displayName = namingConfig.primaryNames?.[name] ?? '';
          meaning = meaningsConfig.primaryMeanings?.[name] ?? '';
        } else if (kind === 'modifier') {
          displayName = namingConfig.modifierNames?.[name] ?? '';
          meaning = meaningsConfig.modifierMeanings?.[name] ?? '';
        } else if (kind === 'control') {
          displayName = namingConfig.controlNames?.[name] ?? '';
          meaning = meaningsConfig.controlMeanings?.[name] ?? '';
        } else if (kind === 'circleBase') {
          meaning = meaningsConfig.circleBaseMeanings?.[name] ?? '';
        }
        insertRune.run(kind, name, displayName, meaning, i);
      });
    }

    const insertPair = db.prepare('INSERT OR IGNORE INTO modifier_pair_names (mod1, mod2, display_name) VALUES (?, ?, ?)');
    for (const [key, displayName] of Object.entries(namingConfig.modifierPairNames ?? {})) {
      const [a, b] = key.split('|');
      if (a && b) insertPair.run(a, b, displayName as string);
    }

    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, category) VALUES (?, ?)');
    const tagCategories = data.tagCategories ?? {};
    for (const tag of data.availableTags ?? []) insertTag.run(tag, tagCategories[tag] ?? null);
    for (const spell of data.spells as SpellRecord[]) {
      for (const tag of spell.tags ?? []) insertTag.run(tag, tagCategories[tag] ?? null);
    }

    const now = Date.now();
    const normalizedSpells: SpellRecord[] = (data.spells as SpellRecord[]).map((s) => ({
      id: s.id,
      circleBase: s.circleBase,
      primaryRune: s.primaryRune,
      modifierRunes: [...(s.modifierRunes ?? [])].sort(),
      controlRune: s.controlRune ?? null,
      createdAt: s.createdAt ?? now,
      updatedAt: now,
      tags: s.tags ?? [],
      status: (s.status ?? 'normal') as SpellStatus,
      description: s.description ?? '',
      customName: s.customName ?? '',
      summary: (s.summary ?? '').slice(0, 100),
    }));

    insertFullSpells(db, normalizedSpells);
  });

  try {
    tx();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
