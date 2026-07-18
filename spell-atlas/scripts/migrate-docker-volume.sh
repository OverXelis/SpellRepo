#!/usr/bin/env bash
# Copy spell-atlas data from the old Docker named volume into the bind-mount
# folder used by docker-compose.yml. Safe to run more than once (skips if the
# destination already has spell-atlas.db unless --force is passed).
#
# Usage (on the NAS, from the spell-atlas repo directory):
#   sudo ./scripts/migrate-docker-volume.sh
#   sudo ./scripts/migrate-docker-volume.sh --force

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=nas-data-dir.sh
source "$SCRIPT_DIR/nas-data-dir.sh"

DEST="$SPELL_ATLAS_DATA_DIR"
FORCE=false
OLD_VOLUME="${SPELL_ATLAS_OLD_VOLUME:-}"

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    -h|--help)
      echo "Usage: $0 [--force]"
      echo "  DEST: $DEST (override with SPELL_ATLAS_DATA_DIR)"
      echo "  OWNER: $SPELL_ATLAS_OWNER (override with SPELL_ATLAS_OWNER)"
      echo "  OLD_VOLUME: auto-detect, or set SPELL_ATLAS_OLD_VOLUME"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "This script needs root to copy files and set ownership. Re-run with sudo." >&2
  exit 1
fi

ensure_data_dir

if [[ -f "$DEST/spell-atlas.db" && "$FORCE" != true ]]; then
  echo "Destination already has spell-atlas.db: $DEST/spell-atlas.db"
  echo "Nothing to do. Pass --force to overwrite from the old volume."
  fix_permissions "$DEST" || true
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

fix_permissions "$DEST"

echo "Done. Files now in $DEST:"
ls -la "$DEST"
echo ""
echo "Next: docker compose up -d --build"
