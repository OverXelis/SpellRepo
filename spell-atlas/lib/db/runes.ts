import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { RuneKind, SpellRecord } from '@/lib/core/types';
import {
  generateForNewControl,
  generateForNewModifier,
  generateForNewPrimary,
} from '@/lib/core/rune-calculator';
import { getRuneLists } from '@/lib/db/naming';
import { deleteSpells, getAllSpellIds, getSpellsByIds, insertSpells, resyncNamesForRune } from '@/lib/db/spells';

const KIND_TO_DB: Record<RuneKind, string> = {
  circleBase: 'circleBase',
  primary: 'primary',
  modifier: 'modifier',
  control: 'control',
};

export interface AddRuneResult {
  addedCount: number;
  batchId: string;
}

/** Adds a new rune of the given kind and generates every valid new spell
 * combination it creates, mirroring the original app's generator. Records a
 * batch so it can be undone. */
export function addRune(db: Database.Database, kind: RuneKind, name: string): AddRuneResult {
  const trimmed = name.trim();
  if (!trimmed) return { addedCount: 0, batchId: '' };

  const runeLists = getRuneLists(db);
  const existingSpells = getSpellsByIds(db, getAllSpellIds(db));

  let newSpells: SpellRecord[];
  if (kind === 'circleBase') {
    // Circle bases don't generate combinations on their own in the original
    // mechanics -- they're multiplied in when a primary rune is added. We
    // still allow registering one so it's available for future primaries.
    newSpells = [];
  } else if (kind === 'primary') {
    newSpells = generateForNewPrimary(runeLists, trimmed, existingSpells);
  } else if (kind === 'modifier') {
    newSpells = generateForNewModifier(runeLists, trimmed, existingSpells);
  } else {
    newSpells = generateForNewControl(runeLists, trimmed, existingSpells);
  }

  const batchId = nanoid();
  const tx = db.transaction(() => {
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM runes WHERE kind = ?').get(KIND_TO_DB[kind]) as {
      m: number;
    };
    db.prepare('INSERT OR IGNORE INTO runes (kind, name, display_name, sort_order) VALUES (?, ?, ?, ?)').run(
      KIND_TO_DB[kind],
      trimmed,
      '',
      maxSort.m + 1
    );

    if (newSpells.length > 0) {
      insertSpells(db, newSpells);
      db.prepare(
        'INSERT INTO batch_history (id, type, rune_name, spell_ids_json, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(batchId, kind, trimmed, JSON.stringify(newSpells.map((s) => s.id)), Date.now());
    }
  });
  tx();

  return { addedCount: newSpells.length, batchId };
}

export interface RemoveRuneResult {
  removedSpellCount: number;
}

/** Finds every spell that references a given rune (or circle base), used
 * both to preview a deletion's blast radius before the user confirms it,
 * and to actually cascade-delete them. */
export function getAffectedSpellIds(db: Database.Database, kind: RuneKind, name: string): string[] {
  if (kind === 'primary') {
    return (db.prepare('SELECT id FROM spells WHERE primary_rune = ?').all(name) as { id: string }[]).map((r) => r.id);
  }
  if (kind === 'control') {
    return (db.prepare('SELECT id FROM spells WHERE control_rune = ?').all(name) as { id: string }[]).map((r) => r.id);
  }
  if (kind === 'circleBase') {
    return (db.prepare('SELECT id FROM spells WHERE circle_base = ?').all(name) as { id: string }[]).map((r) => r.id);
  }
  // modifier
  return (
    db
      .prepare('SELECT s.id as id FROM spells s JOIN spell_modifiers sm ON sm.spell_id = s.id WHERE sm.modifier_rune = ?')
      .all(name) as { id: string }[]
  ).map((r) => r.id);
}

export function countAffectedSpells(db: Database.Database, kind: RuneKind, name: string): number {
  return getAffectedSpellIds(db, kind, name).length;
}

export function removeRune(db: Database.Database, kind: RuneKind, name: string): RemoveRuneResult {
  const idsToRemove = getAffectedSpellIds(db, kind, name);

  const tx = db.transaction(() => {
    if (idsToRemove.length > 0) deleteSpells(db, idsToRemove);
    db.prepare('DELETE FROM runes WHERE kind = ? AND name = ?').run(KIND_TO_DB[kind], name);
    if (kind === 'modifier') {
      db.prepare('DELETE FROM modifier_pair_names WHERE mod1 = ? OR mod2 = ?').run(name, name);
    }
  });
  tx();

  return { removedSpellCount: idsToRemove.length };
}

export function renameRune(db: Database.Database, kind: RuneKind, oldName: string, newName: string): void {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;

  const tx = db.transaction(() => {
    db.prepare('UPDATE runes SET name = ? WHERE kind = ? AND name = ?').run(trimmed, KIND_TO_DB[kind], oldName);

    if (kind === 'primary') {
      db.prepare('UPDATE spells SET primary_rune = ? WHERE primary_rune = ?').run(trimmed, oldName);
    } else if (kind === 'control') {
      db.prepare('UPDATE spells SET control_rune = ? WHERE control_rune = ?').run(trimmed, oldName);
    } else if (kind === 'modifier') {
      db.prepare('UPDATE spell_modifiers SET modifier_rune = ? WHERE modifier_rune = ?').run(trimmed, oldName);
      db.prepare('UPDATE modifier_pair_names SET mod1 = ? WHERE mod1 = ?').run(trimmed, oldName);
      db.prepare('UPDATE modifier_pair_names SET mod2 = ? WHERE mod2 = ?').run(trimmed, oldName);
    } else if (kind === 'circleBase') {
      db.prepare('UPDATE spells SET circle_base = ? WHERE circle_base = ?').run(trimmed, oldName);
    }
  });
  tx();

  if (kind === 'primary' || kind === 'control' || kind === 'modifier') {
    resyncNamesForRune(db, kind, trimmed);
  }
}

export function updateDisplayName(db: Database.Database, kind: RuneKind, name: string, displayName: string): void {
  db.prepare('UPDATE runes SET display_name = ? WHERE kind = ? AND name = ?').run(displayName, KIND_TO_DB[kind], name);
  if (kind === 'primary' || kind === 'control' || kind === 'modifier') {
    resyncNamesForRune(db, kind, name);
  }
}

/** Updates a rune's free-text "meaning" note (AI context only -- doesn't
 * affect spell naming, so no resync needed). */
export function updateRuneMeaning(db: Database.Database, kind: RuneKind, name: string, meaning: string): void {
  db.prepare('UPDATE runes SET meaning = ? WHERE kind = ? AND name = ?').run(meaning, KIND_TO_DB[kind], name);
}

export function updateModifierPairName(db: Database.Database, mod1: string, mod2: string, displayName: string): void {
  const [a, b] = [mod1, mod2].sort();
  db.prepare(
    'INSERT INTO modifier_pair_names (mod1, mod2, display_name) VALUES (?, ?, ?) ON CONFLICT(mod1, mod2) DO UPDATE SET display_name = excluded.display_name'
  ).run(a, b, displayName);
  resyncNamesForRune(db, 'modifier', a);
}

export interface BatchRecord {
  id: string;
  type: RuneKind;
  runeName: string;
  spellIds: string[];
  createdAt: number;
}

export function getBatchHistory(db: Database.Database): BatchRecord[] {
  const rows = db.prepare('SELECT * FROM batch_history ORDER BY created_at ASC').all() as {
    id: string;
    type: RuneKind;
    rune_name: string;
    spell_ids_json: string;
    created_at: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    runeName: r.rune_name,
    spellIds: JSON.parse(r.spell_ids_json),
    createdAt: r.created_at,
  }));
}

export function undoLastBatch(db: Database.Database): BatchRecord | null {
  const history = getBatchHistory(db);
  if (history.length === 0) return null;
  const last = history[history.length - 1];

  const tx = db.transaction(() => {
    deleteSpells(db, last.spellIds);
    db.prepare('DELETE FROM batch_history WHERE id = ?').run(last.id);

    // If no remaining spell references this rune, drop it from the rune list
    // too (mirrors the original app's undo behavior).
    let stillUsed = 0;
    if (last.type === 'primary') {
      stillUsed = (db.prepare('SELECT COUNT(*) as c FROM spells WHERE primary_rune = ?').get(last.runeName) as { c: number }).c;
    } else if (last.type === 'control') {
      stillUsed = (db.prepare('SELECT COUNT(*) as c FROM spells WHERE control_rune = ?').get(last.runeName) as { c: number }).c;
    } else if (last.type === 'modifier') {
      stillUsed = (
        db
          .prepare('SELECT COUNT(*) as c FROM spell_modifiers WHERE modifier_rune = ?')
          .get(last.runeName) as { c: number }
      ).c;
    }
    if (stillUsed === 0 && (last.type === 'primary' || last.type === 'control' || last.type === 'modifier')) {
      db.prepare('DELETE FROM runes WHERE kind = ? AND name = ?').run(last.type, last.runeName);
    }
  });
  tx();

  return last;
}
