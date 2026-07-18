# Spell Atlas

A self-hosted rebuild of the `spell-circle-db` rune/spell tool, with two views:

- **Builder** (`/builder`) — add runes, auto-generate every valid spell combination (same combinatorial logic as the original app), then search/filter/tag/curate them, plus a batched AI description generator (see below) for filling in the flood of auto-generated combinations.
- **Chat** (`/chat`) — describe a scene or goal in prose; Claude searches the database (read-only, via tool calls) and suggests spells that fit.

Everything lives in one SQLite file on your server, so both your Mac and Windows PC see the same data — no more export/import as a sync mechanism.

## Why this design

- **One shared database, reachable from any device.** Run it once (e.g. on your NAS), reach it from anywhere on your Tailscale network.
- **Scales as your rune list grows.** Full-text search (SQLite FTS5) plus indexed rune/tag/status filters, server-side pagination — the browser never has to load the whole table.
- **The AI never sees the whole database.** Each chat turn gets a small, bounded "taxonomy" (the list of distinct runes and tags, not every spell) in its system prompt, plus two tools: `search_spells` (capped, paginated results) and `get_spell_details` (full detail on specific ids only, max 10 at a time). The model is instructed to narrow before going deep — see `lib/ai/system-prompt.ts` and `lib/ai/tools.ts`.
- **Chat is strictly read-only.** `/api/chat` queries the database through a connection opened in SQLite `readonly` mode (`getReadOnlyDb()` in `lib/db/client.ts`), and there is no write tool defined at all. Even a bug in the tool-calling code can't mutate your data.

## Batch AI description generation

Adapted from an earlier standalone Python script the author used to bulk-fill spell names/descriptions/summaries/tags via Claude. The Builder's "Generate descriptions with AI" panel does the same thing, with two changes that matter as the rune list keeps growing:

- **Batched, not one-call-per-spell.** Each API call handles many spells at once (default 20, configurable), using Claude's tool-use to force structured output instead of regex-parsing free text. A rune that generates 130 new spells is ~7 calls, not 130.
- **Prompt caching.** The system prompt is marked as an Anthropic cache breakpoint, so batches after the first in a run reuse the cached prefix instead of re-billing it in full.
- **Never overwrites what you've written.** Only fills in whichever of name/description/summary/tags are currently empty for a given spell; skips a spell entirely once all four are filled.
- **Tags default to your existing list.** The model is instructed to strongly prefer reusing tags already in use, and only introduce a new one when nothing existing fits *and* the concept is general enough to apply to other spells too (not a one-off tag for a single spell).
- **Rune "meanings."** Each rune row in the Builder has a small "AI context" field (separate from its display name) — e.g. `Fire` → *"Elemental fire damage, versatile, moderate cost."* That's what feeds the model's understanding of what each rune actually does; filling these in noticeably improves generation quality.
- The panel shows a live count of how many spells in the selected scope need enrichment, a rough cost estimate before you start, and streams results as they come in with a Stop button to cancel a run early (anything already processed is saved).

By default this uses the same model as chat (`ANTHROPIC_MODEL`, `claude-sonnet-5`). Set `ANTHROPIC_BATCH_MODEL` to override just this feature — e.g. `claude-haiku-4-5` for a cheaper/faster model on very large runs — without changing what the chat uses.

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
2. **Create the data folder on the NAS** (recommended before first start):
   ```bash
   mkdir -p /volume1/dockerapps/appdata/spell-atlas
   ```
   Docker can sometimes create a missing bind-mount path on its own, but on UGREEN/UGOS it is safer to create the folder yourself (File Manager or SSH) so permissions and snapshot/backup rules are correct. If your storage pool is not `volume1`, change the path in `docker-compose.yml` to match your shared-folder layout.
3. Build and run with Docker Compose. On the NAS, using UGOS's Container Manager (or SSH + `docker compose`):
   ```bash
   git clone <this repo> spell-atlas
   cd spell-atlas
   cp .env.example .env
   # edit .env: set ANTHROPIC_API_KEY and APP_PASSWORD
   docker compose up -d --build
   ```
   The SQLite database is created automatically at `/volume1/dockerapps/appdata/spell-atlas/spell-atlas.db` on first run.
4. From your Mac or Windows PC (on the same tailnet), open `http://<nas-tailscale-name>:3000`. Since it's only reachable over Tailscale, the `APP_PASSWORD` gate is a light extra layer, not your main line of defense — but set it anyway.
5. (Optional) Run `tailscale serve https / http://localhost:3000` on the NAS if you want a clean HTTPS URL instead of `http://host:3000`.

### Migrating from the old Docker named volume

If you already ran Spell Atlas with the previous `docker-compose.yml` (which used a Docker-managed volume named `spell-atlas-data`), your existing database is still in that volume — not in `appdata/spell-atlas` yet. Move it once:

```bash
cd spell-atlas
git pull   # get the updated docker-compose.yml
docker compose down

# Option A — migration script (recommended)
chmod +x scripts/migrate-docker-volume.sh
./scripts/migrate-docker-volume.sh

# Option B — manual copy while the old container still exists
mkdir -p /volume1/dockerapps/appdata/spell-atlas
docker cp spell-atlas:/data/. /volume1/dockerapps/appdata/spell-atlas/

docker compose up -d --build
```

The script looks for a volume named `spell-atlas_spell-atlas-data` or `spell-atlas-data` (Compose prefixes the project directory name). If yours is different, run `docker volume ls | grep spell` and set `SPELL_ATLAS_OLD_VOLUME=your_volume_name ./scripts/migrate-docker-volume.sh`.

After you confirm the app loads your spells correctly, you can remove the old unused volume:

```bash
docker volume rm spell-atlas_spell-atlas-data   # name from `docker volume ls`
```

### Backups

The whole database is the single file at `DATABASE_PATH` (plus SQLite's `-wal`/`-shm` sidecar files while the app is running). Snapshotting `/volume1/dockerapps/appdata/spell-atlas` with your NAS's normal backup tool is sufficient. You can also hit `GET /api/export` at any time (or the "Export JSON" button in the Builder UI) for a portable JSON backup.

## Project layout

```
lib/core/            Pure domain logic ported from the original app
                      (rune-calculator.ts, spell-name-generator.ts, types.ts)
lib/db/               SQLite access layer (schema.sql + typed query modules)
lib/ai/               Claude tool definitions/executors/system prompt for chat,
                      plus the batched description generator and its cost estimator
app/api/              REST-ish API routes used by both the Builder UI and,
                      for /api/chat, the Anthropic tool-use loop
app/builder/          Builder UI (rune input, spell table, tags)
app/chat/             Chat UI
scripts/              One-off scripts (legacy data migration)
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | for Chat & batch generation | Your Claude API key |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-sonnet-5`. Used by chat, and by batch generation unless `ANTHROPIC_BATCH_MODEL` is set |
| `ANTHROPIC_BATCH_MODEL` | no | Overrides the model used only by the batch description generator (e.g. `claude-haiku-4-5` for cheaper large runs) |
| `APP_PASSWORD` | recommended | Shared passphrase gate for the whole app |
| `DATABASE_PATH` | no | Defaults to `./data/spell-atlas.db` (set to `/data/spell-atlas.db` in Docker) |
