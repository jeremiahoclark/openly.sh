# openly.sh

**A one-command Cloudflare link shortener with analytics.** Scaffolds a fully
working Worker + D1 project, creates the database, runs the migration, and
deploys — in under 60 seconds.

```bash
npx create-openly
# or
npx create-openly my-link-tracker
```

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jeremiahoclark/create-openly/tree/main/example)

---

## What you get

- **Short links** at `<your-domain>/l/<slug>` (or `<your-domain>/<slug>`).
- **A dashboard** at `<your-domain>/` to create slugs and see analytics.
- **Analytics**: distinct visitors per day, world map, devices, OSes, top
  countries — with Google/Apple prefetch traffic filtered out.
- **Zero servers, zero cost** at low traffic. Runs on Cloudflare Workers + D1.
- **No framework**: plain TypeScript, no bundler beyond wrangler. The whole
  app is ~1,000 lines you can read and modify.

## Two ways to install

### 1. `npx create-openly` (recommended)

Scaffolds locally, creates the D1 database, runs the migration, and deploys to
your Cloudflare account. The CLI walks you through it.

```bash
npx create-openly                 # prompts for name and domain
npx create-openly my-tracker      # name from arg, prompts for domain
npx create-openly t --domain links.example.com
```

Flags:

| Flag             | Meaning                                                   |
| ---------------- | --------------------------------------------------------- |
| `--domain <d>`   | Custom domain (e.g. `links.example.com`).                 |
| `--skip-deploy`  | Scaffold + create D1 + migrate, but don't deploy.         |
| `--skip-install` | Skip `npm install` (useful in CI).                        |
| `-h`, `--help`   | Show help.                                                |

Requires: Node 18+, a free Cloudflare account.

### 2. Deploy to Cloudflare button

Click the button above. Cloudflare clones the [`example/`](./example) tree,
prompts you to create a D1 database, runs the migration, and deploys —
all inside Cloudflare's UI. No local CLI needed.

## How it works

```
my-tracker/
├── wrangler.jsonc          ← Worker config + D1 binding
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            ← fetch handler
│   ├── router.ts           ← Routes, redirect, click logging, stats queries
│   ├── slug.ts             ← Slugify + URL validation
│   ├── ua.ts               ← User-Agent → device + OS
│   ├── prefetch.ts         ← Detect Google/Apple prefetch traffic
│   ├── countryCodes.ts     ← ISO 3166-1 alpha-2 → numeric
│   ├── dashboard.ts        ← Server-rendered HTML + D3 charts
│   └── schema.sql          ← D1 schema (slugs + clicks)
└── tests/
    └── *.test.ts           ← `node --test` unit tests
```

### Routes

| Route               | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `GET /`             | Dashboard. `?slug=<slug>` filters analytics.       |
| `POST /api/slugs`   | Create a slug. JSON or form-encoded.               |
| `GET /api/slugs`    | List all slugs with click counts.                  |
| `GET /api/check`    | Live slug-availability check (used by the form).   |
| `GET /l/:slug`      | Canonical short redirect (302).                    |
| `GET /:slug`        | Redirect alias (root-level convenience).           |

### What this is NOT

- **Not a SaaS.** It's a single-tenant, self-hosted tool that you own.
- **No auth.** Anyone with the dashboard URL can create slugs. Put
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  in front if you need auth.
- **No multi-tenancy, billing, or team features.** Out of scope by design.

## Development

```bash
cd my-tracker
npm run dev          # local wrangler dev on http://localhost:8787
npm test             # node --test on the pure-function modules
npm run typecheck    # tsc --noEmit
npm run deploy       # migrate D1 + wrangler deploy
```

## Repo layout

This repo (`create-openly`) ships:

- `bin/cli.mjs` — the `npx create-openly` CLI. Zero runtime deps.
- `templates/` — files copied into the user's project, with `{{PROJECT_NAME}}`,
  `{{DB_NAME}}`, `{{DB_DATABASE_ID}}` placeholders.
- `example/` — a concrete, deployable rendering of the templates. Targeted by
  the Deploy-to-Cloudflare button.

## License

MIT.
