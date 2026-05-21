# openly.sh

A link shortener you actually own. One command, sixty seconds, your domain, your database.

## Problem

You need a short link — maybe for an email blast, a podcast, a tweet, a QR code on a flyer. You want `links.you.com/launch` instead of a mile-long UTM tail. And then, a week later, you want to know: *did anyone actually click this?*

The usual options:

- **Bit.ly** is easy, but you don't own the links. The free tier is rate-limited, custom domains are a paid upgrade, and the day a billing card lapses your links go cold.
- **Roll your own.** You spend a Saturday wiring up Postgres and Next.js, pay for a VPS forever, and the analytics page never gets built.
- **A "link management" SaaS.** Twenty bucks a month minimum, plus a dashboard you didn't design and a vendor you didn't pick.

None of these feel right when you just want a link to share.

## How this solves it

One command. About sixty seconds. When it's done, you have a link shortener running on your own Cloudflare account — worker, database, domain, all yours. No middleman.

```bash
npx create-openly
```

What you get a minute later:

- **Short links** like `links.you.com/launch` — your domain, your slugs.
- **A dashboard** where you create slugs and watch them get clicked. Daily visitors, world map, device + OS + country breakdowns.
- **Real numbers.** Google and Apple's prefetch bots are filtered out, so your click counts aren't inflated by automated scanners that never saw your page.
- **A $0 bill** at low traffic. Cloudflare's free tier covers it.
- **About a thousand lines of plain TypeScript** you can read in an hour and modify anything.

You own the worker. You own the database. You own the domain. Nobody else has a key.

## Two ways to install

### 1. `npx create-openly` (recommended)

The CLI walks you through it: scaffolds the project locally, creates the D1 database, runs the schema migration, and deploys to your Cloudflare account.

```bash
npx create-openly                 # prompts for name and domain
npx create-openly my-tracker      # name from arg, prompts for domain
npx create-openly t --domain links.example.com
```

Flags:

| Flag             | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `--domain <d>`   | Custom domain (e.g. `links.example.com`).                 |
| `--skip-deploy`  | Scaffold + create D1 + migrate, but don't deploy.         |
| `--skip-install` | Skip `npm install` (useful in CI).                        |
| `-h`, `--help`   | Show help.                                                |

You need Node 18+ and a free Cloudflare account.

### 2. Deploy to Cloudflare button

Click the button. Cloudflare clones the [`example/`](./example) tree, asks you to create a D1 database, runs the migration, and deploys — all inside Cloudflare's UI. No local CLI needed.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jeremiahoclark/openly.sh/tree/main/example)

## What's inside

Under the hood: a single [Cloudflare Worker](https://workers.cloudflare.com/) (plain TypeScript, no framework) backed by a [D1](https://developers.cloudflare.com/d1/) SQLite database. The dashboard is server-rendered HTML with D3 loaded from a CDN for charts. The generated project lays out like this:

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

## What this is NOT

- **Not a SaaS.** Single-tenant, self-hosted, you own it.
- **No auth.** Anyone with the dashboard URL can create slugs. If that matters, put [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) in front.
- **No multi-tenancy, billing, or team features.** That's a different product.

## Development

```bash
cd my-tracker
npm run dev          # local wrangler dev on http://localhost:8787
npm test             # node --test on the pure-function modules
npm run typecheck    # tsc --noEmit
npm run deploy       # migrate D1 + wrangler deploy
```

## Repo layout

This repo (`openly.sh`) ships:

- `bin/cli.mjs` — the `npx create-openly` CLI. Zero runtime deps.
- `templates/` — files copied into the user's project, with `{{PROJECT_NAME}}`, `{{DB_NAME}}`, `{{DB_DATABASE_ID}}` placeholders.
- `example/` — a concrete, deployable rendering of the templates. Targeted by the Deploy-to-Cloudflare button.

## License

MIT.
