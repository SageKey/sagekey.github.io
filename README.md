# sagekey.com

The SageKey website: a client-facing front door for governed AI agent work, plus the demos
that back it up. Plain static HTML, no build step.

**Live:** <https://sagekey.com>

## What's here

| Path | What it is |
|---|---|
| `index.html` | Home page |
| `method/` | The governance method, written out in full |
| `lab/` | Index of side projects |
| `foreman/` | Front end for Foreman, the live governed-agent demo (API runs separately) |
| `agent-floor/`, `market-arena/`, `codebreaker/` | Demo pages, copied in from their own repos by `deploy.sh` |
| `ratchet/` | Archived paper-trading dashboard |
| `site.css` | Shared styles for the home, method, lab and 404 pages |
| `og.png`, `img/` | Social card and screenshots |

## Hosting

Served by **Vercel**. The Vercel project is connected to this repository and rebuilds
production from `main` on every push, so **this repo is the site**: anything not committed
here is not live.

The three demos are developed in their own repositories
([agent-floor](https://github.com/SageKey/agent-floor),
[market-arena](https://github.com/SageKey/market-arena),
[codebreaker](https://github.com/SageKey/codebreaker)). Their built pages are copied into this
repo at deploy time. Editing a demo's own repo does not change the live site until
`deploy.sh` runs here.

All internal links are root-relative (`/agent-floor/`, `/method/`) on purpose.

## Deploy

```bash
./deploy.sh "what changed"
```

Copies the current demo pages in, commits, pushes, waits for Vercel, then checks every path
returns 200 and that the live bytes match this checkout.

```bash
./deploy.sh --check
```

Verifies the live site without deploying.

## Local development

```bash
python3 -m http.server 8790
```

Then open <http://localhost:8790/>. Serve from the repo root; pages use root-relative paths,
so opening `index.html` directly from disk will not find the stylesheet.

The live Foreman status on the home page only appears on sagekey.com (the API allows that
origin only). Locally it stays hidden.
