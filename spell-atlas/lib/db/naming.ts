import type Database from 'better-sqlite3';
import type { RuneLists, RuneMeaningConfig, RuneNameConfig } from '@/lib/core/types';
import { DEFAULT_CIRCLE_BASES, DEFAULT_CONTROL_RUNES, DEFAULT_MODIFIER_RUNES } from '@/lib/core/types';

interface RuneRow {
  kind: string;
  name: string;
  display_name: string;
  meaning: string;
  sort_order: number;
}

/** Seeds the default rune vocabulary the first time the DB is used (mirrors
 * the defaults from the original spell-circle-db app). Safe to call every
 * time -- uses INSERT OR IGNORE. */
export function ensureDefaultRunesSeeded(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM runes').get() as { c: number };
  if (count.c > 0) return;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO runes (kind, name, display_name, sort_order) VALUES (?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    DEFAULT_CIRCLE_BASES.forEach((name, i) => insert.run('circleBase', name, '', i));
    DEFAULT_MODIFIER_RUNES.forEach((name, i) => insert.run('modifier', name, '', i));
    DEFAULT_CONTROL_RUNES.forEach((name, i) => insert.run('control', name, '', i));
  });
  tx();
}

export function getRuneLists(db: Database.Database): RuneLists {
  const rows = db.prepare('SELECT kind, name FROM runes ORDER BY sort_order ASC, name ASC').all() as RuneRow[];
  const lists: RuneLists = {
    circleBases: [],
    primaryRunes: [],
    modifierRunes: [],
    controlRunes: [],
  };
  for (const row of rows) {
    if (row.kind === 'circleBase') lists.circleBases.push(row.name);
    else if (row.kind === 'primary') lists.primaryRunes.push(row.name);
    else if (row.kind === 'modifier') lists.modifierRunes.push(row.name);
    else if (row.kind === 'control') lists.controlRunes.push(row.name);
  }
  return lists;
}

export function getRuneMeanings(db: Database.Database): RuneMeaningConfig {
  const rows = db.prepare('SELECT kind, name, meaning FROM runes').all() as RuneRow[];
  const config: RuneMeaningConfig = {
    circleBaseMeanings: {},
    primaryMeanings: {},
    modifierMeanings: {},
    controlMeanings: {},
  };
  for (const row of rows) {
    if (!row.meaning) continue;
    if (row.kind === 'circleBase') config.circleBaseMeanings[row.name] = row.meaning;
    else if (row.kind === 'primary') config.primaryMeanings[row.name] = row.meaning;
    else if (row.kind === 'modifier') config.modifierMeanings[row.name] = row.meaning;
    else if (row.kind === 'control') config.controlMeanings[row.name] = row.meaning;
  }
  return config;
}

export function getRuneNameConfig(db: Database.Database): RuneNameConfig {
  const rows = db.prepare('SELECT kind, name, display_name FROM runes').all() as RuneRow[];
  const config: RuneNameConfig = {
    primaryNames: {},
    modifierNames: {},
    modifierPairNames: {},
    controlNames: {},
  };
  for (const row of rows) {
    if (!row.display_name) continue;
    if (row.kind === 'primary') config.primaryNames[row.name] = row.display_name;
    else if (row.kind === 'modifier') config.modifierNames[row.name] = row.display_name;
    else if (row.kind === 'control') config.controlNames[row.name] = row.display_name;
  }
  const pairs = db.prepare('SELECT mod1, mod2, display_name FROM modifier_pair_names').all() as {
    mod1: string;
    mod2: string;
    display_name: string;
  }[];
  for (const pair of pairs) {
    if (!pair.display_name) continue;
    config.modifierPairNames[`${pair.mod1}|${pair.mod2}`] = pair.display_name;
  }
  return config;
}
