# openly.sh

**Own your links, or run the hosted link service yourself.**

**Live site:** [openly.sh](https://openly.sh)

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

You need Node 18+ and a Cloudflare account. Magic-link email uses [Cloudflare Email Service](https://developers.cloudflare.com/email-service/) (the transactional Email Sending product) through the Worker `send_email` binding. Unlike legacy Email Routing — which can only deliver to *verified destination addresses* on your account, useless for emailing arbitrary users — Email Service delivers to any recipient once your sender domain is onboarded.

The CLI writes the `send_email` binding and (if you pass `--email-from`) the `EMAIL_FROM` var for you, so the only piece you do by hand is onboarding the sender domain — that step is dashboard-only (Cloudflare exposes no public API/wrangler command for it):

1. Put the sender domain on Cloudflare DNS.
2. In the dashboard, go to **Compute → Email Service → Email Sending → Onboard Domain**, pick that domain, and confirm the SPF / DKIM / DMARC records Cloudflare adds. Wait for verification (usually 5–15 min).
3. Set `EMAIL_FROM` in `wrangler.jsonc` vars to a sender on that domain (e.g. `"Openly <links@example.com>"`) and redeploy.

Sending to arbitrary recipients requires the **Workers Paid** plan. Without `EMAIL_FROM` (or before the domain verifies), sign-in requests return a development-only link on screen instead of sending email, so the app works immediately either way.

### 2. Deploy to Cloudflare button

Click the button. Cloudflare clones the [`example/`](./example) tree into a new repo on your GitHub and deploys it — the D1 database and KV namespace are provisioned automatically, and the schema bootstraps itself on the first request. The one manual step is production email: onboard your sender domain in **Compute → Email Service → Email Sending → Onboard Domain** (confirm the SPF/DKIM/DMARC records), then set the `EMAIL_FROM` var in `wrangler.jsonc` to a sender on that domain and redeploy. Until then, sign-in links are shown on screen instead of emailed, so the app works immediately.

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

For production magic-link email, the Worker sends through **Cloudflare Email Service** via the structured `send()` builder on the `send_email` binding (`env.EMAIL.send({ from, to, subject, html, text })`). No API keys or npm deps — delivery is handled by the platform.

1. Onboard the sender domain: dashboard → **Compute → Email Service → Email Sending → Onboard Domain**, then confirm the SPF/DKIM/DMARC DNS records. This is the only step with no public API/wrangler equivalent, so it must be done in the UI.
2. Set the binding and vars in `wrangler.jsonc` (the CLI already writes these):

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

3. Redeploy. Sending to arbitrary recipients requires the **Workers Paid** plan.

If a send fails, the sign-in page surfaces the reason (most often the sender domain isn't onboarded/verified yet, or the Worker is on the Free plan). Remove `EMAIL_FROM` to fall back to on-screen dev links while you sort it out.

## Repo layout

This repo (`openly.sh`) ships:

- `bin/cli.mjs` — the `npx create-openly` CLI. Zero runtime deps.
- `templates/` — files copied into the user's project, with `{{PROJECT_NAME}}`, `{{DB_NAME}}`, `{{DB_DATABASE_ID}}`, and `{{KV_NAMESPACE_ID}}` placeholders.
- `example/` — a concrete, deployable rendering of the templates. Targeted by the Deploy-to-Cloudflare button.

## License

Custom attribution license. Commercial use is allowed when credit is given back to the original openly.sh repository.
