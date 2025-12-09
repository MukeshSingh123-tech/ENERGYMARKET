
#!/usr/bin/env bash
set -euo pipefail
ROOT=$(dirname "$0")/..
REMOVE=false
if [ "${1:-}" = "--remove" ]; then REMOVE=true; fi

patterns=(
  "*/build/contracts/*.json"
  "*/artifacts/*"
  "*/cache/*"
  "*/dist/*"
  "*/node_modules/*"
  "*/__pycache__/*"
  "**/package-lock.json"
  "**/yarn.lock"
  "**/*.pyc"
)

echo "Scanning for typical build artifacts. Root: $ROOT"
found=()

for p in "${patterns[@]}"; do
  matches=$(find "$ROOT" -path "$p" -print 2>/dev/null || true)
  if [ -n "$matches" ]; then
    while IFS= read -r m; do
      found+=("$m")
    done <<< "$matches"
  fi
done

if [ ${#found[@]} -eq 0 ]; then
  echo "No artifacts found matching patterns."
  exit 0
fi

echo "Found artifacts:"
for f in "${found[@]}"; do echo " - $f"; done

if [ "$REMOVE" = true ]; then
  echo "Removing artifacts..."
  for f in "${found[@]}"; do
    rm -rf "$f" && echo "Removed: $f"
  done
  echo "Removal complete."
else
  echo "Run the script with --remove to actually delete these files."
fi
