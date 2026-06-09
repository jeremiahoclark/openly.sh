# openly.sh

**Own your links, or run the hosted link service yourself.**

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jeremiahoclark/openly.sh/tree/main/example)

openly.sh runs on Cloudflare Workers + D1 and now supports both paths:

- **Indie-dev copy/paste:** deploy your own signed-in link tracker to Cloudflare with one command.
- **Consumer service:** users sign in by magic link and get a private dashboard with their own links and analytics.

## Problem

You need a short link — maybe for an email blast, a podcast, a tweet, a QR code on a flyer. You want `links.you.com/launch` instead of a mile-long UTM tail. And then, a week later, you want to know: *did anyone actually click this?*

The usual options:

- **Hosted shorteners** are easy until you want click analytics — that runs ~$30/month. You also don't own the links: the day a billing card lapses, they go cold.
- **Roll your own.** You spend a Saturday wiring up Postgres and Next.js, pay for a VPS forever, and the analytics page never gets built.

Neither feels right when you just want a link to share.

## How this solves it

One command. About sixty seconds. When it's done, you have a link tracker running on Cloudflare — worker, database, optional domain, magic-link auth, and analytics.

```bash
npx create-openly
```

What you get a minute later:

- **Short links** like `links.you.com/launch` — your domain, your slugs.
- **Magic-link sign-in** so every user gets a private dashboard.
- **A dashboard** where you create links and watch them get clicked. Daily visitors, world map, device + OS + country breakdowns.
- **Plan-aware limits.** Free accounts track 5 active links at a time. Pro is included free for a limited time while Stripe billing is wired up. Planned Pro pricing is $5/month or $25/year.
- **Real numbers.** Google and Apple's prefetch bots are filtered out, so your click counts aren't inflated by automated scanners that never saw your page.
- **A $0 bill** at low traffic. Cloudflare's free tier covers it.
- **Plain TypeScript** you can read in an hour and modify anything.

Self-hosters own the worker, database, and domain. Service operators can run the same code as a lightweight multi-user product.

## Two ways to install

### 1. `npx create-openly` (recommended)

The CLI walks you through it: scaffolds the project locally, creates the D1 database, runs the schema migration, configures the Cloudflare email binding, and deploys to your Cloudflare account.

```bash
npx create-openly                 # prompts for name and domain
npx create-openly my-tracker      # name from arg, prompts for domain
npx create-openly t --domain links.example.com
npx create-openly t --email-from "Openly <links@example.com>"
```

Flags:

| Flag             | What it does                                              |
| ---------------- | --------------------------------------------------------- |
| `--domain <d>`   | Custom domain (e.g. `links.example.com`).                 |
| `--email-from <from>` | Magic-link sender address.                          |
| `--skip-email-setup` | Skip email prompts; dev sign-in links are shown on screen until email is configured. |
| `--skip-deploy`  | Scaffold + create D1 + migrate, but don't deploy.         |
| `--skip-install` | Skip `npm install` (useful in CI).                        |
| `-h`, `--help`   | Show help.                                                |

You need Node 18+ and a Cloudflare account. Magic-link email uses Cloudflare Email Service / Email Routing through the Worker `send_email` binding:

1. Put the sender domain on Cloudflare DNS.
2. Enable Cloudflare Email Service or Email Routing for that domain.
3. Set `EMAIL_FROM` in `wrangler.jsonc` vars to a sender from that domain.

Without `EMAIL_FROM`, sign-in requests return a development-only link on screen instead of sending email.

### 2. Deploy to Cloudflare button

Click the button. Cloudflare clones the [`example/`](./example) tree and deploys inside Cloudflare's UI. After first deploy, create/bind D1 if prompted, run `src/schema.sql`, enable Cloudflare Email Service for your sender domain, and set the `EMAIL_FROM` var for production magic-link email.

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
│   ├── router.ts           ← Routes, auth gates, redirect, click logging, stats queries
│   ├── auth.ts             ← Magic links, sessions, account plans
│   ├── slug.ts             ← Slugify + URL validation
│   ├── ua.ts               ← User-Agent → device + OS
│   ├── prefetch.ts         ← Detect Google/Apple prefetch traffic
│   ├── countryCodes.ts     ← ISO 3166-1 alpha-2 → numeric
│   ├── dashboard.ts        ← Server-rendered HTML + D3 charts
│   └── schema.sql          ← D1 schema (accounts, sessions, magic links, slugs + clicks)
└── tests/
    └── *.test.ts           ← `node --test` unit tests
```

### Routes

| Route               | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `GET /`             | Signed-in dashboard. `?slug=<slug>` filters analytics. |
| `GET /signin`       | Magic-link sign-in form.                           |
| `POST /auth/magic-link` | Request a magic link.                         |
| `GET /auth/verify`  | Consume a magic-link token and create a session.   |
| `POST /auth/logout` | Clear the current session.                         |
| `POST /api/slugs`   | Create an account-scoped link. JSON or form-encoded. |
| `GET /api/slugs`    | List the signed-in user's active links with click counts. |
| `POST /api/slugs/:slug/archive` | Archive one of the signed-in user's active links. |
| `GET /api/check`    | Live slug-availability and limit check.            |
| `GET /favicon.svg`  | Minimal SVG favicon.                               |
| `GET /og-card.svg`  | Minimal social preview card.                       |
| `GET /l/:slug`      | Canonical short redirect (302).                    |
| `GET /:slug`        | Redirect alias (root-level convenience).           |

## What this is NOT

- **Not wired to Stripe yet.** Pro is marked as included free for a limited time. Billing should be the final integration step.
- **Not a team product yet.** Accounts are individual email identities.
- **Not a full email platform.** It uses Cloudflare's native `send_email` Worker binding for magic links.

## Development

```bash
cd my-tracker
npm run dev          # local wrangler dev on http://localhost:8787
npm test             # node --test on the pure-function modules
npm run typecheck    # tsc --noEmit
npm run deploy       # migrate D1 + wrangler deploy
```

For production magic-link email:

Set:

```json
{
  "vars": {
    "EMAIL_FROM": "Openly <links@example.com>",
    "APP_ORIGIN": "https://links.example.com"
  },
  "send_email": [
    {
      "name": "EMAIL"
    }
  ]
}
```

## Repo layout

This repo (`openly.sh`) ships:

- `bin/cli.mjs` — the `npx create-openly` CLI. Zero runtime deps.
- `templates/` — files copied into the user's project, with `{{PROJECT_NAME}}`, `{{DB_NAME}}`, `{{DB_DATABASE_ID}}`, and `{{KV_NAMESPACE_ID}}` placeholders.
- `example/` — a concrete, deployable rendering of the templates. Targeted by the Deploy-to-Cloudflare button.

## License

Custom attribution license. Commercial use is allowed when credit is given back to the original openly.sh repository.
