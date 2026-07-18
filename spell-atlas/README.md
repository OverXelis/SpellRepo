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

## Deploying on your UGREEN NAS (Portainer + Tailscale)

This repo is set up for **Portainer stacks deployed from Git** (`https://github.com/OverXelis/SpellRepo`). Portainer should use compose path **`spell-atlas/docker-compose.yml`** (not the repo root).

### One-time: data folder and permissions

Create the folder on **volume2** and give your NAS user read/write access. Docker Compose cannot set Linux folder ownership — this is a one-time step on the host (SSH as admin):

```bash
sudo mkdir -p /volume2/dockerapps/appdata/spell-atlas
sudo chown -R OverXelous:OverXelous /volume2/dockerapps/appdata/spell-atlas
sudo chmod -R u+rwX /volume2/dockerapps/appdata/spell-atlas
```

If you already copied your database here with `docker cp`, run only the `chown` / `chmod` lines.

The bind mount in `docker-compose.yml` is:

```yaml
- /volume2/dockerapps/appdata/spell-atlas:/data
```

Your SQLite file lives at **`/volume2/dockerapps/appdata/spell-atlas/spell-atlas.db`** on the NAS. This folder is **database only** — do not put logo or banner images here.

**Logo and banner images** belong in the git repo at `spell-atlas/public/logo.png` and `spell-atlas/public/name-banner.png`, then redeploy the Portainer stack so the image rebuild picks them up.

### Portainer: first deploy

1. Tailscale running on the NAS (already set up).
2. In Portainer: **Stacks → Add stack → Git repository**
   - Repository URL: `https://github.com/OverXelis/SpellRepo`
   - Compose path: `spell-atlas/docker-compose.yml`
   - Add environment variables (`ANTHROPIC_API_KEY`, `APP_PASSWORD`, etc.) in the stack editor or via `.env` if you use one.
3. Deploy the stack.
4. Open `http://<nas-tailscale-name>:3000` from a device on your tailnet.

### Portainer: update after a git change

When `spell-atlas/docker-compose.yml` changes on `main`:

1. In Portainer, open your **spell-atlas** stack.
2. Use **Pull and redeploy** (or **Update the stack** → pull latest from Git).
3. Confirm the stack recreates with the new compose file.

You do **not** need `git` installed on the NAS for this — Portainer pulls from GitHub for you.

### Migrating from the old Docker named volume

If the app previously used Portainer with the old compose file (Docker-managed volume `spell-atlas-data`), copy the database **before** redeploying with the new bind mount:

```bash
# Copy from the running container (works while the app is still up)
docker cp spell-atlas:/data/. /volume2/dockerapps/appdata/spell-atlas/

# Fix ownership so File Explorer and OverXelous can access the files
sudo chown -R OverXelous:OverXelous /volume2/dockerapps/appdata/spell-atlas
sudo chmod -R u+rwX /volume2/dockerapps/appdata/spell-atlas
```

Then in Portainer: **Pull and redeploy** the stack so it picks up the updated `docker-compose.yml` with the `/volume2/...` bind mount.

Verify after redeploy:

```bash
ls -la /volume2/dockerapps/appdata/spell-atlas/
docker inspect spell-atlas --format '{{range .Mounts}}{{.Type}} | {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

You want mount type **`bind`** and source **`/volume2/dockerapps/appdata/spell-atlas`**.

After confirming your spells load in the browser, you can remove the old unused volume:

```bash
docker volume ls | grep spell
docker volume rm spell-atlas_spell-atlas-data   # use the name you see
```

### Optional: SSH + docker compose (without Portainer)

```bash
git clone https://github.com/OverXelis/SpellRepo.git
cd SpellRepo/spell-atlas
cp .env.example .env   # set ANTHROPIC_API_KEY and APP_PASSWORD
docker compose up -d --build
```

### Optional: HTTPS via Tailscale

Run `tailscale serve https / http://localhost:3000` on the NAS if you want a clean HTTPS URL instead of `http://host:3000`.

### Backups

The whole database is the single file at `DATABASE_PATH` (plus SQLite's `-wal`/`-shm` sidecar files while the app is running). Snapshotting `/volume2/dockerapps/appdata/spell-atlas` with your NAS's normal backup tool is sufficient. You can also hit `GET /api/export` at any time (or the "Export JSON" button in the Builder UI) for a portable JSON backup.

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
