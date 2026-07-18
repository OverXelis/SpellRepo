import type Database from 'better-sqlite3';
import type { SpellRecord, SpellStatus, SpellSummaryRecord } from '@/lib/core/types';
import { generateSpellName } from '@/lib/core/spell-name-generator';
import { getRuneNameConfig } from '@/lib/db/naming';

interface SpellRow {
  id: string;
  circle_base: string;
  primary_rune: string;
  control_rune: string | null;
  generated_name: string;
  custom_name: string;
  summary: string;
  description: string;
  status: SpellStatus;
  created_at: number;
  updated_at: number;
}

function getModifiersFor(db: Database.Database, spellId: string): string[] {
  const rows = db
    .prepare('SELECT modifier_rune FROM spell_modifiers WHERE spell_id = ? ORDER BY modifier_rune ASC')
    .all(spellId) as { modifier_rune: string }[];
  return rows.map((r) => r.modifier_rune);
}

function getModifiersForMany(db: Database.Database, spellIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (spellIds.length === 0) return map;
  const placeholders = spellIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT spell_id, modifier_rune FROM spell_modifiers WHERE spell_id IN (${placeholders}) ORDER BY modifier_rune ASC`)
    .all(...spellIds) as { spell_id: string; modifier_rune: string }[];
  for (const row of rows) {
    const arr = map.get(row.spell_id) ?? [];
    arr.push(row.modifier_rune);
    map.set(row.spell_id, arr);
  }
  return map;
}

function getTagsFor(db: Database.Database, spellId: string): string[] {
  const rows = db
    .prepare(
      `SELECT t.name as name FROM spell_tags st JOIN tags t ON t.id = st.tag_id WHERE st.spell_id = ? ORDER BY t.name ASC`
    )
    .all(spellId) as { name: string }[];
  return rows.map((r) => r.name);
}

function getTagsForMany(db: Database.Database, spellIds: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (spellIds.length === 0) return map;
  const placeholders = spellIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT st.spell_id as spell_id, t.name as name FROM spell_tags st JOIN tags t ON t.id = st.tag_id WHERE st.spell_id IN (${placeholders}) ORDER BY t.name ASC`
    )
    .all(...spellIds) as { spell_id: string; name: string }[];
  for (const row of rows) {
    const arr = map.get(row.spell_id) ?? [];
    arr.push(row.name);
    map.set(row.spell_id, arr);
  }
  return map;
}

function rowToRecord(row: SpellRow, modifierRunes: string[], tags: string[]): SpellRecord {
  return {
    id: row.id,
    circleBase: row.circle_base,
    primaryRune: row.primary_rune,
    modifierRunes,
    controlRune: row.control_rune,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    status: row.status,
    description: row.description,
    customName: row.custom_name,
    summary: row.summary,
  };
}

function rowToSummary(row: SpellRow, modifierRunes: string[], tags: string[]): SpellSummaryRecord {
  return {
    id: row.id,
    name: row.generated_name,
    circleBase: row.circle_base,
    primaryRune: row.primary_rune,
    modifierRunes,
    controlRune: row.control_rune,
    tags,
    status: row.status,
    summary: row.summary,
  };
}

function ftsTextForTags(tags: string[]): string {
  return tags.join(' ');
}

function ftsTextForRunes(circleBase: string, primaryRune: string, modifierRunes: string[], controlRune: string | null): string {
  return [circleBase, primaryRune, ...modifierRunes, controlRune].filter(Boolean).join(' ');
}

function syncFtsRow(
  db: Database.Database,
  spellId: string,
  fields: { name: string; summary: string; description: string; tags: string[]; circleBase: string; primaryRune: string; modifierRunes: string[]; controlRune: string | null }
) {
  db.prepare('DELETE FROM spells_fts WHERE spell_id = ?').run(spellId);
  db.prepare(
    'INSERT INTO spells_fts (spell_id, name, summary, description, tags_text, runes_text) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    spellId,
    fields.name,
    fields.summary,
    fields.description,
    ftsTextForTags(fields.tags),
    ftsTextForRunes(fields.circleBase, fields.primaryRune, fields.modifierRunes, fields.controlRune)
  );
}

/** Recomputes generated_name from the current naming config and keeps the
 * FTS row for a spell in sync. Called on insert, and again whenever naming
 * config for a rune this spell uses has changed. */
function recomputeAndSyncOne(db: Database.Database, row: SpellRow) {
  const modifierRunes = getModifiersFor(db, row.id);
  const tags = getTagsFor(db, row.id);
  const config = getRuneNameConfig(db);
  const name = generateSpellName(
    { modifierRunes, primaryRune: row.primary_rune, controlRune: row.control_rune, customName: row.custom_name },
    config
  );
  db.prepare('UPDATE spells SET generated_name = ? WHERE id = ?').run(name, row.id);
  syncFtsRow(db, row.id, {
    name,
    summary: row.summary,
    description: row.description,
    tags,
    circleBase: row.circle_base,
    primaryRune: row.primary_rune,
    modifierRunes,
    controlRune: row.control_rune,
  });
}

export function getSpellById(db: Database.Database, id: string): SpellRecord | null {
  const row = db.prepare('SELECT * FROM spells WHERE id = ?').get(id) as SpellRow | undefined;
  if (!row) return null;
  return rowToRecord(row, getModifiersFor(db, id), getTagsFor(db, id));
}

export function getSpellsByIds(db: Database.Database, ids: string[]): SpellRecord[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM spells WHERE id IN (${placeholders})`).all(...ids) as SpellRow[];
  const modifiersMap = getModifiersForMany(db, ids);
  const tagsMap = getTagsForMany(db, ids);
  return rows.map((row) => rowToRecord(row, modifiersMap.get(row.id) ?? [], tagsMap.get(row.id) ?? []));
}

/** Bulk-inserts freshly generated spells (from the rune calculator). Runs in
 * a single transaction. */
export function insertSpells(db: Database.Database, spells: SpellRecord[]): void {
  if (spells.length === 0) return;
  const insertSpell = db.prepare(
    `INSERT INTO spells (id, circle_base, primary_rune, control_rune, generated_name, custom_name, summary, description, status, created_at, updated_at)
     VALUES (@id, @circleBase, @primaryRune, @controlRune, '', '', '', '', @status, @createdAt, @updatedAt)`
  );
  const insertModifier = db.prepare('INSERT INTO spell_modifiers (spell_id, modifier_rune) VALUES (?, ?)');
  const config = getRuneNameConfig(db);

  const tx = db.transaction(() => {
    for (const spell of spells) {
      insertSpell.run({
        id: spell.id,
        circleBase: spell.circleBase,
        primaryRune: spell.primaryRune,
        controlRune: spell.controlRune,
        status: spell.status,
        createdAt: spell.createdAt,
        updatedAt: spell.updatedAt,
      });
      for (const mod of spell.modifierRunes) {
        insertModifier.run(spell.id, mod);
      }
      const name = generateSpellName(spell, config);
      db.prepare('UPDATE spells SET generated_name = ? WHERE id = ?').run(name, spell.id);
      syncFtsRow(db, spell.id, {
        name,
        summary: spell.summary,
        description: spell.description,
        tags: spell.tags,
        circleBase: spell.circleBase,
        primaryRune: spell.primaryRune,
        modifierRunes: spell.modifierRunes,
        controlRune: spell.controlRune,
      });
    }
  });
  tx();
}

/** Inserts spells with all fields populated (tags, description, custom
 * name, summary, status, timestamps) -- used by import/migration, as
 * opposed to insertSpells() which is for freshly generated, blank
 * combinations. */
export function insertFullSpells(db: Database.Database, spells: SpellRecord[]): void {
  if (spells.length === 0) return;
  const insertSpell = db.prepare(
    `INSERT INTO spells (id, circle_base, primary_rune, control_rune, generated_name, custom_name, summary, description, status, created_at, updated_at)
     VALUES (@id, @circleBase, @primaryRune, @controlRune, '', @customName, @summary, @description, @status, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET
       circle_base = excluded.circle_base,
       primary_rune = excluded.primary_rune,
       control_rune = excluded.control_rune,
       custom_name = excluded.custom_name,
       summary = excluded.summary,
       description = excluded.description,
       status = excluded.status,
       updated_at = excluded.updated_at`
  );
  const insertModifier = db.prepare('INSERT OR IGNORE INTO spell_modifiers (spell_id, modifier_rune) VALUES (?, ?)');
  const findOrCreateTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO spell_tags (spell_id, tag_id) VALUES (?, ?)');

  const tx = db.transaction(() => {
    for (const spell of spells) {
      insertSpell.run({
        id: spell.id,
        circleBase: spell.circleBase,
        primaryRune: spell.primaryRune,
        controlRune: spell.controlRune,
        customName: spell.customName,
        summary: spell.summary,
        description: spell.description,
        status: spell.status,
        createdAt: spell.createdAt,
        updatedAt: spell.updatedAt,
      });
      db.prepare('DELETE FROM spell_modifiers WHERE spell_id = ?').run(spell.id);
      for (const mod of spell.modifierRunes) insertModifier.run(spell.id, mod);
      db.prepare('DELETE FROM spell_tags WHERE spell_id = ?').run(spell.id);
      for (const tagName of spell.tags) {
        findOrCreateTag.run(tagName);
        const tagRow = getTagId.get(tagName) as { id: number };
        linkTag.run(spell.id, tagRow.id);
      }
    }
  });
  tx();

  resyncSpellsByIds(db, spells.map((s) => s.id));
}

export interface SpellPatch {
  status?: SpellStatus;
  description?: string;
  customName?: string;
  summary?: string;
  tags?: string[];
}

export function updateSpell(db: Database.Database, id: string, patch: SpellPatch): SpellRecord | null {
  const existing = db.prepare('SELECT * FROM spells WHERE id = ?').get(id) as SpellRow | undefined;
  if (!existing) return null;

  const tx = db.transaction(() => {
    const now = Date.now();
    if (patch.status !== undefined) {
      db.prepare('UPDATE spells SET status = ?, updated_at = ? WHERE id = ?').run(patch.status, now, id);
    }
    if (patch.description !== undefined) {
      db.prepare('UPDATE spells SET description = ?, updated_at = ? WHERE id = ?').run(patch.description, now, id);
    }
    if (patch.customName !== undefined) {
      db.prepare('UPDATE spells SET custom_name = ?, updated_at = ? WHERE id = ?').run(patch.customName, now, id);
    }
    if (patch.summary !== undefined) {
      const trimmed = patch.summary.slice(0, 100);
      db.prepare('UPDATE spells SET summary = ?, updated_at = ? WHERE id = ?').run(trimmed, now, id);
    }
    if (patch.tags !== undefined) {
      db.prepare('DELETE FROM spell_tags WHERE spell_id = ?').run(id);
      const findOrCreateTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
      const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?');
      const linkTag = db.prepare('INSERT OR IGNORE INTO spell_tags (spell_id, tag_id) VALUES (?, ?)');
      for (const tagName of patch.tags) {
        findOrCreateTag.run(tagName);
        const tagRow = getTagId.get(tagName) as { id: number };
        linkTag.run(id, tagRow.id);
      }
    }

    const refreshed = db.prepare('SELECT * FROM spells WHERE id = ?').get(id) as SpellRow;
    recomputeAndSyncOne(db, refreshed);
  });
  tx();

  return getSpellById(db, id);
}

export function deleteSpell(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM spells_fts WHERE spell_id = ?').run(id);
  db.prepare('DELETE FROM spells WHERE id = ?').run(id);
}

export function deleteSpells(db: Database.Database, ids: string[]): void {
  if (ids.length === 0) return;
  const tx = db.transaction(() => {
    for (const id of ids) deleteSpell(db, id);
  });
  tx();
}

export function getAllSpellIds(db: Database.Database): string[] {
  return (db.prepare('SELECT id FROM spells').all() as { id: string }[]).map((r) => r.id);
}

export function clearAllSpells(db: Database.Database): void {
  const tx = db.transaction(() => {
    db.exec('DELETE FROM spell_tags');
    db.exec('DELETE FROM spell_modifiers');
    db.exec('DELETE FROM spells');
    db.exec('DELETE FROM spells_fts');
    db.exec('DELETE FROM batch_history');
  });
  tx();
}

/** Recomputes generated_name + FTS for every spell that uses a given rune
 * (called after a rename or a display-name edit). Bounded by how many
 * spells use that one rune, not the whole database. */
export function resyncNamesForRune(db: Database.Database, kind: 'primary' | 'modifier' | 'control', name: string): void {
  let rows: SpellRow[];
  if (kind === 'primary') {
    rows = db.prepare('SELECT * FROM spells WHERE primary_rune = ?').all(name) as SpellRow[];
  } else if (kind === 'control') {
    rows = db.prepare('SELECT * FROM spells WHERE control_rune = ?').all(name) as SpellRow[];
  } else {
    rows = db
      .prepare('SELECT s.* FROM spells s JOIN spell_modifiers sm ON sm.spell_id = s.id WHERE sm.modifier_rune = ?')
      .all(name) as SpellRow[];
  }
  const tx = db.transaction(() => {
    for (const row of rows) recomputeAndSyncOne(db, row);
  });
  tx();
}

export function resyncAllNames(db: Database.Database): void {
  const rows = db.prepare('SELECT * FROM spells').all() as SpellRow[];
  const tx = db.transaction(() => {
    for (const row of rows) recomputeAndSyncOne(db, row);
  });
  tx();
}

/** Resyncs generated_name + FTS text for a specific set of spells. Used
 * after tag rename/delete so the FTS tags_text column doesn't go stale. */
export function resyncSpellsByIds(db: Database.Database, ids: string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM spells WHERE id IN (${placeholders})`).all(...ids) as SpellRow[];
  const tx = db.transaction(() => {
    for (const row of rows) recomputeAndSyncOne(db, row);
  });
  tx();
}

function sanitizeFtsQuery(query: string): string | null {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9_]+/i)
    .filter(Boolean)
    .slice(0, 12); // keep queries bounded
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ');
}

export interface SearchFilters {
  query?: string;
  tags?: string[];
  tagMode?: 'all' | 'any';
  circleBase?: string;
  primaryRune?: string;
  modifierRunes?: string[];
  controlRune?: string | null; // null / 'none' means "no control rune"
  status?: SpellStatus;
  /** Only spells missing at least one of customName/description/summary/
   * tags -- i.e. candidates for the AI batch description generator. */
  needsEnrichment?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  results: SpellSummaryRecord[];
  totalMatches: number;
  hasMore: boolean;
  limit: number;
  offset: number;
}

const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;

function buildWhere(db: Database.Database, filters: SearchFilters): { where: string; params: unknown[] } {
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (filters.circleBase) {
    clauses.push('s.circle_base = ?');
    params.push(filters.circleBase);
  }
  if (filters.primaryRune) {
    clauses.push('s.primary_rune = ?');
    params.push(filters.primaryRune);
  }
  if (filters.controlRune !== undefined) {
    if (filters.controlRune === null || filters.controlRune === 'none') {
      clauses.push('s.control_rune IS NULL');
    } else {
      clauses.push('s.control_rune = ?');
      params.push(filters.controlRune);
    }
  }
  if (filters.status) {
    clauses.push('s.status = ?');
    params.push(filters.status);
  }
  if (filters.modifierRunes && filters.modifierRunes.length > 0) {
    for (const mod of filters.modifierRunes) {
      clauses.push('EXISTS (SELECT 1 FROM spell_modifiers sm WHERE sm.spell_id = s.id AND sm.modifier_rune = ?)');
      params.push(mod);
    }
  }
  if (filters.tags && filters.tags.length > 0) {
    if (filters.tagMode === 'any') {
      const placeholders = filters.tags.map(() => '?').join(',');
      clauses.push(
        `EXISTS (SELECT 1 FROM spell_tags st JOIN tags t ON t.id = st.tag_id WHERE st.spell_id = s.id AND t.name IN (${placeholders}))`
      );
      params.push(...filters.tags);
    } else {
      for (const tag of filters.tags) {
        clauses.push(
          'EXISTS (SELECT 1 FROM spell_tags st JOIN tags t ON t.id = st.tag_id WHERE st.spell_id = s.id AND t.name = ?)'
        );
        params.push(tag);
      }
    }
  }
  if (filters.query && filters.query.trim()) {
    const ftsQuery = sanitizeFtsQuery(filters.query);
    if (ftsQuery) {
      clauses.push('s.id IN (SELECT spell_id FROM spells_fts WHERE spells_fts MATCH ?)');
      params.push(ftsQuery);
    }
  }
  if (filters.needsEnrichment) {
    clauses.push(
      `NOT (
        s.custom_name != '' AND s.summary != '' AND s.description != ''
        AND EXISTS (SELECT 1 FROM spell_tags st WHERE st.spell_id = s.id)
      )`
    );
  }

  return { where: clauses.join(' AND '), params };
}

/** Searches spells with compact result rows so a caller (in particular the
 * AI chat) can narrow down before ever fetching full spell details. Result
 * count is always capped at MAX_LIMIT regardless of what's requested. */
export function searchSpells(db: Database.Database, filters: SearchFilters): SearchResult {
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(filters.offset ?? 0, 0);
  const { where, params } = buildWhere(db, filters);

  const totalRow = db.prepare(`SELECT COUNT(*) as c FROM spells s WHERE ${where}`).get(...params) as { c: number };
  const totalMatches = totalRow.c;

  const hasTextQuery = Boolean(filters.query && filters.query.trim());
  const orderBy = hasTextQuery
    ? 'ORDER BY (s.status = \'favorite\') DESC, s.updated_at DESC'
    : "ORDER BY (s.status = 'favorite') DESC, (s.status = 'dud') ASC, (s.status = 'niche') ASC, s.generated_name ASC";

  const rows = db
    .prepare(`SELECT * FROM spells s WHERE ${where} ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as SpellRow[];

  const ids = rows.map((r) => r.id);
  const modifiersMap = getModifiersForMany(db, ids);
  const tagsMap = getTagsForMany(db, ids);

  return {
    results: rows.map((row) => rowToSummary(row, modifiersMap.get(row.id) ?? [], tagsMap.get(row.id) ?? [])),
    totalMatches,
    hasMore: offset + rows.length < totalMatches,
    limit,
    offset,
  };
}

/** Counts spells needing enrichment under a given filter set, without the
 * MAX_LIMIT cap that applies to searchSpells() -- that cap exists to keep
 * the AI chat's context small, which isn't a concern here. */
export function countNeedingEnrichment(db: Database.Database, filters: Omit<SearchFilters, 'limit' | 'offset'>): number {
  const { where, params } = buildWhere(db, { ...filters, needsEnrichment: true });
  const row = db.prepare(`SELECT COUNT(*) as c FROM spells s WHERE ${where}`).get(...params) as { c: number };
  return row.c;
}

/** Fetches full spell records (not just the compact summary shape) needing
 * enrichment, up to `limit`, oldest first -- used by the batch description
 * generator, which needs full field values to know what's already filled
 * in and to build AI context. */
export function getSpellsForEnrichment(
  db: Database.Database,
  filters: Omit<SearchFilters, 'limit' | 'offset'>,
  limit: number
): SpellRecord[] {
  const { where, params } = buildWhere(db, { ...filters, needsEnrichment: true });
  const rows = db
    .prepare(`SELECT * FROM spells s WHERE ${where} ORDER BY s.created_at ASC LIMIT ?`)
    .all(...params, limit) as SpellRow[];
  const ids = rows.map((r) => r.id);
  const modifiersMap = getModifiersForMany(db, ids);
  const tagsMap = getTagsForMany(db, ids);
  return rows.map((row) => rowToRecord(row, modifiersMap.get(row.id) ?? [], tagsMap.get(row.id) ?? []));
}

export function countAllSpells(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM spells').get() as { c: number };
  return row.c;
}

export function countByStatus(db: Database.Database): Record<SpellStatus, number> {
  const rows = db.prepare('SELECT status, COUNT(*) as c FROM spells GROUP BY status').all() as {
    status: SpellStatus;
    c: number;
  }[];
  const result: Record<SpellStatus, number> = { normal: 0, favorite: 0, dud: 0, niche: 0 };
  for (const row of rows) result[row.status] = row.c;
  return result;
}
