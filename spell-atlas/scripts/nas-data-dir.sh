#!/usr/bin/env bash
# Prepare or migrate spell-atlas data on the NAS bind-mount folder.
#
# setup-data-dir.sh — create the folder and give OverXelous read/write access
# migrate-docker-volume.sh — copy from the old Docker named volume, then fix perms
#
# Usage (on the NAS, from the spell-atlas repo directory):
#   sudo ./scripts/setup-data-dir.sh
#   sudo ./scripts/migrate-docker-volume.sh
#   sudo ./scripts/migrate-docker-volume.sh --force

set -euo pipefail

SPELL_ATLAS_DATA_DIR="${SPELL_ATLAS_DATA_DIR:-/volume2/dockerapps/appdata/spell-atlas}"
SPELL_ATLAS_OWNER="${SPELL_ATLAS_OWNER:-OverXelous}"

fix_permissions() {
  local dest="$1"
  if ! id "$SPELL_ATLAS_OWNER" &>/dev/null; then
    echo "Warning: user '$SPELL_ATLAS_OWNER' not found; skipping chown." >&2
    echo "Set SPELL_ATLAS_OWNER to your NAS username if it differs." >&2
    return 1
  fi

  chown -R "$SPELL_ATLAS_OWNER:$SPELL_ATLAS_OWNER" "$dest"
  chmod -R u+rwX "$dest"
  echo "Set ownership to $SPELL_ATLAS_OWNER on $dest"
}

ensure_data_dir() {
  mkdir -p "$SPELL_ATLAS_DATA_DIR"
  fix_permissions "$SPELL_ATLAS_DATA_DIR"
}
