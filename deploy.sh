#!/bin/bash
# Rebuild the sagekey.com bundle from all four sources and deploy to Vercel.
#
# Why this exists: on GitHub Pages the three demos were separate repos that
# GitHub served as siblings automatically. Vercel needs ONE folder, so the
# bundle has to be reassembled from four places every time. Editing a demo
# repo alone does nothing to the live site.
#
# Usage:  ./deploy.sh          (build, deploy to production, verify)
#         ./deploy.sh --check  (verify the live site only, no deploy)

set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
SRC="$HOME/dev/sagekey"
OUT="$ROOT/sagekey-site"
PATHS=(/ /market-arena/ /codebreaker/ /agent-floor/ /foreman/ /ratchet/ /ete-recognition/ /agent-floor/run.json /ratchet/data.json)

verify() {
  echo "--- verifying https://sagekey.com ---"
  local bad=0
  for p in "${PATHS[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://sagekey.com$p" || echo 000)
    if [ "$code" = "200" ]; then printf "  %-24s %s\n" "$p" "$code"
    else printf "  %-24s %s  <<<< BROKEN\n" "$p" "$code"; bad=$((bad+1)); fi
  done
  echo "--- cert ---"
  echo | openssl s_client -connect sagekey.com:443 -servername sagekey.com 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | sed 's/^/  /'
  if [ "$bad" -gt 0 ]; then echo "FAILED: $bad broken path(s)"; return 1; fi
  echo "All ${#PATHS[@]} paths OK."
}

if [ "${1:-}" = "--check" ]; then verify; exit $?; fi

echo "=== rebuilding bundle ==="
rm -rf "$OUT"; mkdir -p "$OUT"
cp "$ROOT/index.html" "$OUT/"
for d in ete-recognition foreman ratchet; do
  mkdir -p "$OUT/$d"; cp -R "$ROOT/$d/." "$OUT/$d/"
done
for d in market-arena codebreaker agent-floor; do
  mkdir -p "$OUT/$d"; cp "$SRC/$d/index.html" "$OUT/$d/"
done
cp "$SRC/agent-floor/run.json" "$OUT/agent-floor/"

# every page must be present and non-empty before we ship anything
for f in index.html market-arena/index.html codebreaker/index.html \
         agent-floor/index.html agent-floor/run.json foreman/index.html \
         ratchet/index.html ratchet/data.json ete-recognition/index.html; do
  [ -s "$OUT/$f" ] || { echo "ABORT: $f missing or empty in bundle"; exit 1; }
done
echo "  $(find "$OUT" -type f ! -path '*/.vercel/*' | wc -l | tr -d ' ') files staged"

echo "=== deploying (--force: skip the cache that caused the 11/26 partial deploy) ==="
cd "$OUT"
NPM_CONFIG_UPDATE_NOTIFIER=false npx -y vercel@latest deploy --prod --force --yes 2>&1 \
  | grep -oE '"(message|error)": "[^"]*"' | head -3

echo "=== waiting 25s for propagation ==="
sleep 25
verify
