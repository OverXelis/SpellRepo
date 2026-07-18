#!/usr/bin/env bash
# Copy spell-atlas data from the old Docker named volume into the bind-mount
# folder used by docker-compose.yml. Safe to run more than once (skips if the
# destination already has spell-atlas.db unless --force is passed).
#
# Usage (on the NAS, from the spell-atlas repo directory):
#   ./scripts/migrate-docker-volume.sh
#   ./scripts/migrate-docker-volume.sh --force
#
# Prerequisites:
#   - docker available
#   - destination folder exists (or will be created by Docker on first start;
#     this script creates it too so the copy has somewhere to go)

set -euo pipefail

DEST="${SPELL_ATLAS_DATA_DIR:-/volume1/dockerapps/appdata/spell-atlas}"
FORCE=false
OLD_VOLUME="${SPELL_ATLAS_OLD_VOLUME:-}"

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    -h|--help)
      echo "Usage: $0 [--force]"
      echo "  DEST: $DEST (override with SPELL_ATLAS_DATA_DIR)"
      echo "  OLD_VOLUME: auto-detect, or set SPELL_ATLAS_OLD_VOLUME"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$DEST"

if [[ -f "$DEST/spell-atlas.db" && "$FORCE" != true ]]; then
  echo "Destination already has spell-atlas.db: $DEST/spell-atlas.db"
  echo "Nothing to do. Pass --force to overwrite from the old volume."
  exit 0
fi

if [[ -z "$OLD_VOLUME" ]]; then
  for candidate in spell-atlas_spell-atlas-data spell-atlas-data; do
    if docker volume inspect "$candidate" >/dev/null 2>&1; then
      OLD_VOLUME="$candidate"
      break
    fi
  done
fi

if [[ -z "$OLD_VOLUME" ]]; then
  echo "Could not find the old named volume (tried spell-atlas_spell-atlas-data, spell-atlas-data)." >&2
  echo "If your volume has a different name, run: docker volume ls | grep spell" >&2
  echo "Then re-run with: SPELL_ATLAS_OLD_VOLUME=your_volume_name $0" >&2
  exit 1
fi

echo "Copying from Docker volume '$OLD_VOLUME' to '$DEST' ..."
docker run --rm \
  -v "$OLD_VOLUME:/from:ro" \
  -v "$DEST:/to" \
  alpine:3.20 \
  sh -c 'cp -av /from/. /to/'

echo "Done. Files now in $DEST:"
ls -la "$DEST"
echo ""
echo "Next: docker compose up -d --build"
