import type Database from 'better-sqlite3';
import type { TagInfo } from '@/lib/core/types';
import { resyncSpellsByIds } from '@/lib/db/spells';

function spellIdsForTag(db: Database.Database, tagName: string): string[] {
  return (
    db
      .prepare('SELECT st.spell_id as id FROM spell_tags st JOIN tags t ON t.id = st.tag_id WHERE t.name = ?')
      .all(tagName) as { id: string }[]
  ).map((r) => r.id);
}

export function getAllTags(db: Database.Database): TagInfo[] {
  const rows = db
    .prepare(
      `SELECT t.name as name, t.category as category, COUNT(st.spell_id) as count
       FROM tags t
       LEFT JOIN spell_tags st ON st.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name ASC`
    )
    .all() as { name: string; category: string | null; count: number }[];
  return rows;
}

export function addTag(db: Database.Database, name: string, category?: string | null): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  db.prepare('INSERT OR IGNORE INTO tags (name, category) VALUES (?, ?)').run(trimmed, category ?? null);
}

export function removeTag(db: Database.Database, name: string): void {
  const affected = spellIdsForTag(db, name);
  db.prepare('DELETE FROM tags WHERE name = ?').run(name);
  resyncSpellsByIds(db, affected);
}

export function renameTag(db: Database.Database, oldName: string, newName: string): void {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === oldName) return;
  const affected = spellIdsForTag(db, oldName);
  db.prepare('UPDATE tags SET name = ? WHERE name = ?').run(trimmed, oldName);
  resyncSpellsByIds(db, affected);
}

export function setTagCategory(db: Database.Database, name: string, category: string | null): void {
  db.prepare('UPDATE tags SET category = ? WHERE name = ?').run(category, name);
}
