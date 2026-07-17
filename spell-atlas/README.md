# Spell Atlas

A self-hosted rebuild of the `spell-circle-db` rune/spell tool, with two views:

- **Builder** (`/builder`) — add runes, auto-generate every valid spell combination (same combinatorial logic as the original app), then search/filter/tag/curate them.
- **Chat** (`/chat`) — describe a scene or goal in prose; Claude searches the database (read-only, via tool calls) and suggests spells that fit.

Everything lives in one SQLite file on your server, so both your Mac and Windows PC see the same data — no more export/import as a sync mechanism.

## Why this design

- **One shared database, reachable from any device.** Run it once (e.g. on your NAS), reach it from anywhere on your Tailscale network.
- **Scales as your rune list grows.** Full-text search (SQLite FTS5) plus indexed rune/tag/status filters, server-side pagination — the browser never has to load the whole table.
- **The AI never sees the whole database.** Each chat turn gets a small, bounded "taxonomy" (the list of distinct runes and tags, not every spell) in its system prompt, plus two tools: `search_spells` (capped, paginated results) and `get_spell_details` (full detail on specific ids only, max 10 at a time). The model is instructed to narrow before going deep — see `lib/ai/system-prompt.ts` and `lib/ai/tools.ts`.
- **Chat is strictly read-only.** `/api/chat` queries the database through a connection opened in SQLite `readonly` mode (`getReadOnlyDb()` in `lib/db/client.ts`), and there is no write tool defined at all. Even a bug in the tool-calling code can't mutate your data.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY at minimum
npm run dev
```

Visit http://localhost:3000. The SQLite file is created at `./data/spell-atlas.db` on first run (schema is applied automatically).

## Migrating your existing data

If you have an export from the original `spell-circle-db` app (its "Export" button produces a JSON file), you can load it in either of two ways:

1. **In the Builder UI**: click "Import" and pick the file. This works for both the legacy export format and this app's own export format.
2. **From the command line**, before first deploying:
   ```bash
   npm run migrate:legacy -- /path/to/spell-circle-db-export.json
   ```

Both paths go through the same `importAll()` function and fully replace existing data (spells, runes, tags, naming config).

## Deploying on your UGREEN NAS via Tailscale

1. Make sure Tailscale is running on the NAS (you already have this set up).
2. Build and run with Docker Compose. On the NAS, using UGOS's Container Manager (or SSH + `docker compose`):
   ```bash
   git clone <this repo> spell-atlas
   cd spell-atlas
   cp .env.example .env
   # edit .env: set ANTHROPIC_API_KEY and APP_PASSWORD
   docker compose up -d --build
   ```
3. Point the `spell-atlas-data` volume at a real path on your storage pool if you want it covered by the NAS's own snapshot/backup jobs (edit `docker-compose.yml`'s `volumes:` section, e.g. `/volume1/docker/spell-atlas/data:/data`).
4. From your Mac or Windows PC (on the same tailnet), open `http://<nas-tailscale-name>:3000`. Since it's only reachable over Tailscale, the `APP_PASSWORD` gate is a light extra layer, not your main line of defense — but set it anyway.
5. (Optional) Run `tailscale serve https / http://localhost:3000` on the NAS if you want a clean HTTPS URL instead of `http://host:3000`.

### Backups

The whole database is the single file at `DATABASE_PATH` (plus SQLite's `-wal`/`-shm` sidecar files while the app is running). Snapshotting that path with your NAS's normal backup tool is sufficient. You can also hit `GET /api/export` at any time (or the "Export JSON" button in the Builder UI) for a portable JSON backup.

## Project layout

```
lib/core/            Pure domain logic ported from the original app
                      (rune-calculator.ts, spell-name-generator.ts, types.ts)
lib/db/               SQLite access layer (schema.sql + typed query modules)
lib/ai/               Claude tool definitions, executors, system prompt
app/api/              REST-ish API routes used by both the Builder UI and,
                      for /api/chat, the Anthropic tool-use loop
app/builder/          Builder UI (rune input, spell table, tags)
app/chat/             Chat UI
scripts/              One-off scripts (legacy data migration)
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | for Chat | Your Claude API key |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-5` |
| `APP_PASSWORD` | recommended | Shared passphrase gate for the whole app |
| `DATABASE_PATH` | no | Defaults to `./data/spell-atlas.db` (set to `/data/spell-atlas.db` in Docker) |
