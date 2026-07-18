-- Spell Atlas schema. Applied idempotently on startup (CREATE ... IF NOT EXISTS),
-- so there is no separate migration-runner step required for this single-user,
-- self-hosted app. Keep this file as the single source of truth for the schema.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Rune vocabulary: circle bases, primary/modifier/control runes, each with an
-- optional display name used to build human-readable spell names.
CREATE TABLE IF NOT EXISTS runes (
  kind TEXT NOT NULL CHECK (kind IN ('circleBase', 'primary', 'modifier', 'control')),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  -- Free-text "what this conceptually does" note (e.g. "Elemental fire
  -- damage, versatile, moderate cost"). Not used for spell naming -- only
  -- as context fed to the AI batch description generator.
  meaning TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, name)
);

-- Display names for modifier pairs (e.g. Empower+Extend -> "Overwhelming").
CREATE TABLE IF NOT EXISTS modifier_pair_names (
  mod1 TEXT NOT NULL,
  mod2 TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (mod1, mod2)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE TABLE IF NOT EXISTS spells (
  id TEXT PRIMARY KEY,
  circle_base TEXT NOT NULL,
  primary_rune TEXT NOT NULL,
  control_rune TEXT,
  generated_name TEXT NOT NULL DEFAULT '',
  custom_name TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'favorite', 'dud', 'niche')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spells_primary ON spells(primary_rune);
CREATE INDEX IF NOT EXISTS idx_spells_circle ON spells(circle_base);
CREATE INDEX IF NOT EXISTS idx_spells_control ON spells(control_rune);
CREATE INDEX IF NOT EXISTS idx_spells_status ON spells(status);

-- Zero, one, or two rows per spell (modifierRunes.length is 0-2).
CREATE TABLE IF NOT EXISTS spell_modifiers (
  spell_id TEXT NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  modifier_rune TEXT NOT NULL,
  PRIMARY KEY (spell_id, modifier_rune)
);
CREATE INDEX IF NOT EXISTS idx_spell_modifiers_rune ON spell_modifiers(modifier_rune);
CREATE INDEX IF NOT EXISTS idx_spell_modifiers_spell ON spell_modifiers(spell_id);

CREATE TABLE IF NOT EXISTS spell_tags (
  spell_id TEXT NOT NULL REFERENCES spells(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (spell_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_spell_tags_tag ON spell_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_spell_tags_spell ON spell_tags(spell_id);

-- Records each "add rune" generation batch so it can be undone.
CREATE TABLE IF NOT EXISTS batch_history (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  rune_name TEXT NOT NULL,
  spell_ids_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Full-text search index over the fields worth free-text searching. This is
-- a standalone (non "external content") FTS5 table, kept in sync manually by
-- application code on every write (see lib/db/queries.ts). Its size tracks
-- the number of spells directly, but a MATCH query only ever returns
-- matching rowids -- the *result set* handed to a caller (including the AI
-- chat) is always capped by an explicit LIMIT, never the whole table.
CREATE VIRTUAL TABLE IF NOT EXISTS spells_fts USING fts5(
  spell_id UNINDEXED,
  name,
  summary,
  description,
  tags_text,
  runes_text
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
