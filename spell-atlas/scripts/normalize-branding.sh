#!/usr/bin/env bash
# Map common upload filenames to the paths the app loads at runtime.
set -euo pipefail

cd "$(dirname "$0")/.."
PUBLIC="public"

pick_newer() {
  local canonical="$1"
  local alternate="$2"

  if [[ ! -f "$alternate" ]]; then
    return 0
  fi

  if [[ ! -f "$canonical" ]] || [[ "$alternate" -nt "$canonical" ]]; then
    cp "$alternate" "$canonical"
    echo "normalize-branding: copied $(basename "$alternate") -> $(basename "$canonical")"
  fi
}

pick_newer "$PUBLIC/logo.png" "$PUBLIC/Logo.png"
pick_newer "$PUBLIC/logo.png" "$PUBLIC/LOGO.PNG"
pick_newer "$PUBLIC/name-banner.png" "$PUBLIC/NamePNG.png"
pick_newer "$PUBLIC/name-banner.png" "$PUBLIC/namePNG.png"
pick_newer "$PUBLIC/name-banner.png" "$PUBLIC/Name.png"

if [[ -f "$PUBLIC/logo.png" ]]; then
  cp "$PUBLIC/logo.png" app/icon.png
  cp "$PUBLIC/logo.png" app/apple-icon.png
  echo "normalize-branding: synced logo.png -> app/icon.png and app/apple-icon.png"
fi
