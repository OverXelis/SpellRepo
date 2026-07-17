/**
 * One-time migration: imports a JSON export from the original spell-circle-db
 * (Dexie/IndexedDB) app into this app's SQLite database.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-export.ts /path/to/spell-circle-db-export.json
 *
 * The export file is the JSON you get from that app's "Export" button --
 * this script does not modify it, it just loads it into the new DB via the
 * same importAll() path used by the in-app Import button, so you can also
 * just use the app's Import button in the Builder UI instead of this script
 * if you prefer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../lib/db/client';
import { importAll } from '../lib/db/export-import';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/migrate-legacy-export.ts <path-to-export.json>');
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const json = fs.readFileSync(resolved, 'utf-8');
  const db = getDb();
  const result = importAll(db, json);

  if (!result.success) {
    console.error(`Import failed: ${result.error}`);
    process.exit(1);
  }

  const count = (db.prepare('SELECT COUNT(*) as c FROM spells').get() as { c: number }).c;
  console.log(`Import succeeded. Database now has ${count} spells at ${process.env.DATABASE_PATH || 'data/spell-atlas.db'}.`);
}

main();
