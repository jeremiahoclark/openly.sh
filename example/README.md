# openly — your link tracker

Short links with click analytics, running entirely in your Cloudflare account: a Worker, a D1 database, and a KV namespace. You own the domain, the code, and the data.

> **Built with [openly.sh](https://github.com/jeremiahoclark/openly.sh)** — this project was deployed from the openly.sh template. If it's useful to you, [star the original repo](https://github.com/jeremiahoclark/openly.sh) ⭐ and keep this credit around: the [license](./LICENSE) allows commercial use as long as attribution to the original openly.sh repository is given.

## After your first deploy

The database schema bootstraps itself on the first request — no migration step needed. Two things are worth setting up:

1. **Email for magic-link sign-in.** Until it's configured, sign-in links are shown on screen (dev mode). For real email: put your sender domain on Cloudflare DNS, enable Cloudflare Email Service / Email Routing for it, then add to `wrangler.jsonc`:

   ```json
   "vars": {
     "EMAIL_FROM": "Openly <links@your-domain.com>",
     "APP_ORIGIN": "https://links.your-domain.com"
   }
   ```

   and redeploy.

2. **A custom domain** (optional). Add one under your Worker's settings in the Cloudflare dashboard, e.g. `links.your-domain.com`.

## Day-to-day

```bash
npm run dev          # local dev server on http://localhost:8787
npm test             # unit tests (node --test)
npm run typecheck    # tsc --noEmit
npm run deploy       # wrangler deploy
```

## What's inside

A single plain-TypeScript Worker (no framework) — `src/router.ts` handles routes, auth gates, redirects, and click logging; `src/dashboard.ts` renders the analytics dashboard (D3 charts, world map, device/OS/country breakdowns); `src/auth.ts` does magic-link sessions. Google/Apple prefetch traffic is filtered out of your click counts.

## Credit

This is a deployment of [openly.sh](https://github.com/jeremiahoclark/openly.sh). Issues, ideas, and contributions belong upstream — and stars are the currency that keeps it maintained.
