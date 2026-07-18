#!/usr/bin/env bash
# Create the spell-atlas data folder on the NAS and give OverXelous read/write
# access. Run once before first deploy (or after creating the folder manually).
#
# Usage (on the NAS):
#   sudo ./scripts/setup-data-dir.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=nas-data-dir.sh
source "$SCRIPT_DIR/nas-data-dir.sh"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "This script needs root to set folder ownership. Re-run with sudo." >&2
  exit 1
fi

ensure_data_dir
echo ""
echo "Ready. Next: docker compose up -d --build"
