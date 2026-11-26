#!/bin/bash
# Deploy sagekey.com.
#
# The repo IS the site. Vercel (project "sagekey-site") is connected to this
# GitHub repo and rebuilds production from main on every push, so anything not
# committed here does not exist on the live site. The three demos are developed
# in their own repos (~/dev/sagekey/<name>), so this script copies their built
# pages in before committing.
#
# History: on 11/25-26/2026 the demos 404'd twice because they were deployed by
# hand from a side folder and the next git push silently replaced that deploy
# with a build of this repo, which did not contain them. Keeping them in the
# repo removes the trap.
#
#   ./deploy.sh ["commit message"]   sync demos, commit, push, wait, verify
#   ./deploy.sh --check              verify the live site only

set -euo pipefail
cd "$(dirname "$0")"
SRC="$HOME/dev/sagekey"
SITE="https://sagekey.com"
PATHS=(/ /method/ /lab/ /foreman/ /agent-floor/ /agent-floor/run.json /market-arena/
       /codebreaker/ /ratchet/ /ratchet/data.json /site.css /og.png /img/foreman-charter.jpg
       /robots.txt /sitemap.xml)
# live path -> local file; the bytes must match, or the deploy has not landed
SAME=("/:index.html" "/site.css:site.css" "/method/:method/index.html" "/lab/:lab/index.html"
      "/agent-floor/:agent-floor/index.html" "/market-arena/:market-arena/index.html"
      "/codebreaker/:codebreaker/index.html")

sha() { shasum -a 256 | cut -d' ' -f1; }
in_sync() {
  for pair in "${SAME[@]}"; do
    [ "$(curl -s --max-time 25 "$SITE${pair%%:*}" | sha)" = "$(sha < "${pair#*:}")" ] || return 1
  done
}
verify() {
  local bad=0 code
  echo "--- $SITE ---"
  for p in "${PATHS[@]}"; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$SITE$p" || echo 000)
    if [ "$code" = "200" ]; then printf "  %-24s %s\n" "$p" "$code"
    else printf "  %-24s %s  <<<< BROKEN\n" "$p" "$code"; bad=$((bad+1)); fi
  done
  if in_sync; then echo "  live content matches this checkout"
  else echo "  LIVE CONTENT DIFFERS FROM THIS CHECKOUT  <<<<"; bad=$((bad+1)); fi
  echo "  cert: $(echo | openssl s_client -connect sagekey.com:443 -servername sagekey.com 2>/dev/null \
      | openssl x509 -noout -enddate 2>/dev/null)"
  [ "$bad" -eq 0 ] && echo "OK: ${#PATHS[@]} paths, content in sync." || { echo "FAILED: $bad problem(s)"; return 1; }
}

if [ "${1:-}" = "--check" ]; then verify; exit $?; fi

echo "=== syncing demos from their own repos ==="
for d in market-arena codebreaker agent-floor; do
  [ -f "$SRC/$d/index.html" ] || { echo "ABORT: $SRC/$d/index.html not found"; exit 1; }
  mkdir -p "$d"; cp "$SRC/$d/index.html" "$d/"
done
cp "$SRC/agent-floor/run.json" agent-floor/

git add -A
if git diff --cached --quiet; then echo "=== nothing new to commit ==="
else git commit -q -m "${1:-Update site}"; echo "=== committed $(git rev-parse --short HEAD) ==="; fi
git push -q origin main

echo "=== waiting for Vercel to serve this commit ==="
for i in $(seq 1 30); do
  if in_sync; then echo "  live after ~$((i*8))s"; break; fi
  sleep 8
done
verify
