import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDefaultRunesSeeded } from '@/lib/db/naming';

const DATABASE_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'spell-atlas.db');

function ensureDirExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function applySchema(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  runMigrations(db);
}

/**
 * Lightweight, idempotent column additions for deployments that already
 * have a populated database. `CREATE TABLE IF NOT EXISTS` in schema.sql is
 * a no-op once the table exists, so new columns need to be added here
 * instead -- checked via PRAGMA table_info so this is always safe to run
 * on every startup, including against a database that already has the
 * column (e.g. a fresh install).
 */
function runMigrations(db: Database.Database) {
  const runeColumns = db.prepare('PRAGMA table_info(runes)').all() as { name: string }[];
  if (!runeColumns.some((c) => c.name === 'meaning')) {
    db.exec("ALTER TABLE runes ADD COLUMN meaning TEXT NOT NULL DEFAULT ''");
  }
}

let writable: Database.Database | null = null;
let readOnly: Database.Database | null = null;

/**
 * The single read-write connection used by the builder UI's API routes.
 * All spell/rune/tag mutations flow through here.
 */
export function getDb(): Database.Database {
  if (!writable) {
    ensureDirExists(DATABASE_PATH);
    writable = new Database(DATABASE_PATH);
    applySchema(writable);
    // Seed default circle bases/modifiers/controls here (once, idempotently)
    // rather than in individual routes -- previously only /api/taxonomy and
    // /api/chat did this, so hitting e.g. /api/runes first on a fresh
    // database left circleBases empty and silently generated zero spell
    // combinations for the first primary rune added.
    ensureDefaultRunesSeeded(writable);
  }
  return writable;
}

/**
 * A read-only connection used exclusively by the AI chat's tool-execution
 * layer. Opening SQLite in readonly mode means even a bug in the chat's
 * tool-calling code cannot write to the database -- the AI can query
 * spells, but it physically cannot change them.
 */
export function getReadOnlyDb(): Database.Database {
  if (!readOnly) {
    // Make sure the writable connection (and schema) exists first, since a
    // readonly connection can't create the file or tables itself.
    getDb();
    readOnly = new Database(DATABASE_PATH, { readonly: true });
  }
  return readOnly;
}

export function getDatabasePath(): string {
  return DATABASE_PATH;
}
