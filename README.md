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

## Pointing sagekey.com at it later

The page is built so this takes zero edits to the HTML.

1. Add a `CNAME` file at the repo root containing `sagekey.com` (or set the custom domain under
   repo **Settings → Pages**, which writes the same file).
2. At the DNS registrar: four apex `A` records pointing at GitHub Pages' IPs, plus a `www` CNAME
   pointing at `sagekey.github.io`. *(Per GitHub's docs — confirm the current IP list against
   their custom-domain page at the time you do it rather than trusting this README.)*
3. Enable **Enforce HTTPS** once the certificate provisions.

Because the links are root-relative, they resolve against whatever host is serving the page. The
demo project pages inherit the custom domain automatically — `sagekey.com/agent-floor/` starts
working without touching those repos either.

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
