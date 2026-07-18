# SpellRepo

Monorepo for **Spell Atlas** — a self-hosted spell database and AI writing assistant built around the rune magic system from the **Spell Weaver Chronicles** (SWC) novel series.

The active application lives in [`spell-atlas/`](spell-atlas/). Deploy that directory via Docker; everything else here is legacy reference or supporting material.

## What is Spell Atlas?

Spell Atlas helps you manage a combinatorial spell library: circle bases, primary runes, modifiers, and control runes combine into every valid spell your system allows. You curate the results, tag favorites, and use Claude to research spells against your own database while you write.

One SQLite database on your server (NAS, homelab, or local machine). Reach it from a phone, Mac, or PC over Tailscale or your private network — no export/import sync between devices.

## Quick start (production)

**Recommended:** deploy with [Portainer](https://www.portainer.io/) from this Git repository.

| Setting | Value |
|---------|--------|
| Repository | `https://github.com/OverXelis/SpellRepo` |
| Compose path | `spell-atlas/docker-compose.yml` |
| Port | `3000` |

Full setup (data folder, environment variables, updates, backups, custom logo): **[spell-atlas/README.md](spell-atlas/README.md)**

## Repository layout

```
spell-atlas/           The app — deploy this
  app/                 Next.js pages (Builder, Contemplate, Chat)
  components/          UI
  lib/                 Domain logic, SQLite layer, Claude integration
  public/              Static assets (logo.png, name-banner.png; Logo.png and NamePNG.png also accepted)
  scripts/             Migration helpers
  docker-compose.yml   Portainer / Docker Compose stack

spell-circle-tool/     Legacy predecessor (spell-circle-db) — reference only
```

## Tech stack

- **Next.js 16** (App Router), React 19, TypeScript
- **SQLite** via `better-sqlite3` (FTS5 search, single-file database)
- **Anthropic Claude** for chat and batch description generation
- **Docker** for self-hosted deployment

## Local development

```bash
cd spell-atlas
npm install
cp .env.example .env.local   # set ANTHROPIC_API_KEY at minimum
npm run dev
```

Open http://localhost:3000

## Legacy data

If you have a JSON export from the original `spell-circle-db` app, import it through the Builder UI or:

```bash
cd spell-atlas
npm run migrate:legacy -- /path/to/export.json
```

## License

Private project for the Spell Weaver Chronicles worldbuilding workflow. All rights reserved unless otherwise noted by the repository owner.
