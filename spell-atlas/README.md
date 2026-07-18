# Spell Atlas

Self-hosted spell database and AI research assistant for the **Spell Weaver Chronicles** rune magic system.

Run it once on your NAS or homelab, open it from any device on your Tailscale network, and work from one shared SQLite database — no syncing exports between machines.

## Features

### Builder (`/builder`)

- Add **circle bases**, **primary runes**, **modifiers**, and **control runes**; the app generates every valid spell combination automatically.
- Search and filter with full-text search (SQLite FTS5), rune filters, tags, and favorites/duds.
- Edit spell names, summaries, descriptions, and tags inline.
- Manage tags and modifier-pair display names.
- Import and export the full database as JSON.

The rune panel is split into two columns: circle bases and primaries on the left, modifiers and control runes on the right. Tags sit above the spell table.

### Contemplate Meaning (`/contemplate`)

Batch AI generation for spells that still need names, summaries, descriptions, or tags.

- Processes many spells per Claude API call (configurable batch size) with prompt caching to keep large runs affordable.
- Never overwrites fields you have already filled in.
- Streams progress with a stop button; completed spells are saved immediately.
- Shows a **review table** of spells from your latest batch runs so you can read and edit results before going back to the Builder.

Fill in each rune's **AI context** field in the Builder for noticeably better generation quality.

### Chat (`/chat`)

Describe a scene or goal in plain language. Claude searches your spell library through read-only tool calls and suggests options that fit.

- The model never receives your entire spell list — only a compact taxonomy plus paginated search results.
- Chat uses a SQLite connection opened in **readonly** mode; there is no write tool, so the assistant cannot mutate your database.

## Architecture notes

| Concern | Approach |
|---------|----------|
| Data | Single SQLite file (`spell-atlas.db`) |
| Search | FTS5 + indexed filters, server-side pagination |
| Chat safety | Read-only DB connection, bounded tool results |
| Batch generation | Claude tool-use, batched calls, optional separate model |
| Auth | Optional shared passphrase (`APP_PASSWORD`) |

## Deploy with Portainer (recommended)

This stack is designed to deploy from Git through Portainer.

| Setting | Value |
|---------|--------|
| Repository URL | `https://github.com/OverXelis/SpellRepo` |
| Compose path | `spell-atlas/docker-compose.yml` |
| Branch | `main` |

### Environment variables

Set these in the Portainer stack editor (or a `.env` file referenced by compose):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | For Chat and Contemplate | Your Claude API key |
| `APP_PASSWORD` | Recommended | Shared login passphrase |
| `ANTHROPIC_MODEL` | No | Default `claude-sonnet-5` |
| `ANTHROPIC_BATCH_MODEL` | No | Override model for batch generation only |
| `DATABASE_PATH` | No | Set automatically to `/data/spell-atlas.db` in Docker |

See [`.env.example`](.env.example) for a template.

### Persistent data (database)

The compose file bind-mounts a folder on your NAS pool:

```yaml
/volume2/dockerapps/appdata/spell-atlas:/data
```

Inside the container this is `/data`. The database file is:

```
/volume2/dockerapps/appdata/spell-atlas/spell-atlas.db
```

**One-time setup** on the NAS (SSH as admin — Compose cannot set Linux ownership):

```bash
sudo mkdir -p /volume2/dockerapps/appdata/spell-atlas
sudo chown -R OverXelous:OverXelous /volume2/dockerapps/appdata/spell-atlas
sudo chmod -R u+rwX /volume2/dockerapps/appdata/spell-atlas
```

Adjust the volume path if your pool is not `volume2`, and change `OverXelous` if your NAS username differs.

This folder is **database only**. Do not put logo or banner images here.

### Custom logo and banner

Replace these files in **git**, then **Pull and redeploy** in Portainer (rebuild required):

| File | Used for |
|------|----------|
| `public/logo.png` | Favicon, nav icon, login screen |
| `public/name-banner.png` | Builder page header banner |

### First deploy

1. Create the data folder and set permissions (above).
2. In Portainer: **Stacks → Add stack → Git repository** with the settings above.
3. Add environment variables.
4. Deploy.
5. Open `http://<your-nas-tailscale-name>:3000` from a device on your tailnet.

### Updating after a git change

1. Open your spell-atlas stack in Portainer.
2. **Pull and redeploy**.

You do not need `git` on the NAS — Portainer pulls from GitHub.

### Migrating from an old Docker named volume

If you previously used the internal Docker volume (`spell-atlas-data`), copy the database **before** switching to the bind mount:

```bash
docker volume ls | grep spell

docker run --rm \
  -v YOUR_OLD_VOLUME_NAME:/from:ro \
  -v /volume2/dockerapps/appdata/spell-atlas:/to \
  alpine sh -c "cp -av /from/. /to/"

sudo chown -R OverXelous:OverXelous /volume2/dockerapps/appdata/spell-atlas
sudo chmod -R u+rwX /volume2/dockerapps/appdata/spell-atlas
```

Or use the helper script (from a machine that has the repo cloned):

```bash
sudo ./scripts/migrate-docker-volume.sh
```

Then **Pull and redeploy** in Portainer. Verify:

```bash
docker inspect spell-atlas --format '{{range .Mounts}}{{.Type}} | {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

You want mount type `bind` and source `/volume2/dockerapps/appdata/spell-atlas`.

### Backups

- Snapshot `/volume2/dockerapps/appdata/spell-atlas` with your NAS backup jobs (includes `spell-atlas.db` and SQLite `-wal`/`-shm` sidecars while running).
- Or use **Export JSON** in the Builder UI / `GET /api/export` for a portable backup anytime.

### Optional: HTTPS via Tailscale

On the NAS:

```bash
tailscale serve https / http://localhost:3000
```

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. SQLite is created at `./data/spell-atlas.db` on first run.

## Migrating from spell-circle-db

Import a legacy JSON export through the Builder **Import** button, or:

```bash
npm run migrate:legacy -- /path/to/spell-circle-db-export.json
```

Both paths replace existing data (spells, runes, tags, naming config).

## Deploy without Portainer

```bash
git clone https://github.com/OverXelis/SpellRepo.git
cd SpellRepo/spell-atlas
cp .env.example .env
docker compose up -d --build
```

Ensure the bind-mount path in `docker-compose.yml` exists on the host before starting.

## Project layout

```
app/
  builder/           Spell database UI
  contemplate/       Batch AI generation and review
  chat/              Scene-based spell research chat
  api/               REST routes and Claude integration
components/          Shared UI
lib/
  core/              Rune combinatorics and spell naming (ported from spell-circle-db)
  db/                SQLite schema and queries
  ai/                Chat tools, batch generator, system prompts
public/              logo.png, name-banner.png (static assets baked into Docker image)
scripts/             NAS migration and legacy import helpers
```

## Related project

[`spell-circle-tool/`](../spell-circle-tool/) in this repository is the earlier standalone spell-circle-db app. Spell Atlas is its successor: same rune logic, shared database on the server, modern UI, and integrated Claude chat plus batch generation.
