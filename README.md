# sagekey.github.io

The SageKey front door — who I am, what I build, and the three public demos, plus a written
case study of the agent-workforce method.

Single self-contained `index.html`. No backend, no build step, no dependencies.

## Why this repo is named `sagekey.github.io`

GitHub serves a repo named `<org>.github.io` at the **org root** — `https://sagekey.github.io/` —
rather than under a project subpath. That makes the three demo repos siblings of this page:

```
sagekey.github.io/                 ← this repo
sagekey.github.io/market-arena/    ← SageKey/market-arena
sagekey.github.io/codebreaker/     ← SageKey/codebreaker
sagekey.github.io/agent-floor/     ← SageKey/agent-floor
```

Every internal link on the page is **root-relative** (`/agent-floor/`, not a full URL) on purpose.
See "Pointing sagekey.com at it" below.

## sagekey.com

`CNAME` claims the apex domain. Domain registrar and DNS: **GoDaddy**. Mail: **Google
Workspace** — the `MX` and Google `TXT` records are what carry `bretta@sagekey.com` and must be
left alone; only the `A` and `www` records below change.

The repo side is done. The registrar side is these records (values confirmed against GitHub's
custom-domain docs on 2026-08-16):

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `sagekey.github.io` |

The two pre-existing apex `A` records (`3.33.130.190`, `15.197.148.33`) are GoDaddy's parking
lander and get deleted. Optional IPv6 — `AAAA` on `@`: `2606:50c0:8000::153` through
`2606:50c0:8003::153`.

Order matters: the domain is claimed on the Pages site *before* the DNS records point at GitHub,
so nobody else can host on it in the gap. The tradeoff is that `sagekey.github.io` redirects to
`sagekey.com` from the moment `CNAME` lands — so until the records are switched, the live site
is the parking page. Don't leave that half-finished.

After DNS propagates, turn on **Enforce HTTPS** in Settings → Pages (the certificate provisions
automatically first; the checkbox is greyed out until it does).

Because every internal link is root-relative, none of this touches the HTML — and the three demo
project pages inherit the domain on their own, so `sagekey.com/agent-floor/` starts working
without any change to those repos.

## Local development

The page links to `/market-arena/` etc., which do not exist inside this repo — so serving this
folder directly gives you a working page with four dead links.

`.staging/` (gitignored) solves that: it symlinks this `index.html` alongside the three demo
working copies, reproducing the deployed layout exactly.

```bash
python3 -m http.server 8790 --directory .staging
```

Then open <http://localhost:8790/>. In Claude Code: `preview_start` with name `portfolio`.

To rebuild the staging mirror from scratch:

```bash
mkdir -p .staging && cd .staging && ln -sf ../index.html index.html && ln -sfn ~/dev/liquidation-arena market-arena && ln -sfn ~/dev/codebreaker codebreaker && ln -sfn ~/dev/agent-floor agent-floor
```

Note `market-arena` points at `~/dev/liquidation-arena` — that folder name predates the rename.

## Deploy

GitHub Pages off `main`. Push and it is live.
