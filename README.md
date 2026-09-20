# Swagattam — combined GitHub Pages site

This repository builds and deploys **one website** with two parts glued
together at deploy time:

- `site/` — the marketing/landing page for Swagattam Party Lawns. This owns
  the domain root `/`.
- `app/` — the Event Estimate Studio (customer estimator + admin panel).
  Its built-in routes are `/111` (estimator) and `/999` (admin).

You never build or deploy these separately. `.github/workflows/deploy.yml`
builds both on every push to `main`, merges their output into one static
site, and deploys that merged result to GitHub Pages.

## How the merge works

1. `site/` is built first — its `dist/` becomes the base of the deployed
   site (index.html, media, CNAME, 404 page, etc. all live at the root).
2. `app/` is built separately — its `dist/` produces its own `index.html`
   plus a JS/CSS bundle.
3. The workflow copies `app`'s JS/CSS into the same `/assets/` folder as
   `site`'s (safe — Vite gives every file a unique content hash, so nothing
   overwrites anything), then places a copy of `app`'s `index.html` at both
   `/111/index.html` and `/999/index.html`. Loading either physically
   serves the same estimator app, which reads the URL itself to decide
   whether to show the customer estimator or the admin panel.

This was built and tested locally (real `npm install` + `npm run build` for
both apps, merged output served and every route/asset checked) before this
repository was put together.

## Local development

Work on each app independently, exactly like any normal Vite project:

```bash
cd site && npm install && npm run dev   # landing page
cd app && npm install && npm run dev    # estimator + admin
```

## Required GitHub configuration

**Settings → Pages → Source:** GitHub Actions

**Settings → Secrets and variables → Actions → Variables:**
- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase publishable/anon key
- `CUSTOM_DOMAIN` — your domain (e.g. `www.swagattampartylawns.com`), if using one

## Supabase

The estimator's database setup lives in `supabase/` (same files as in
`app/supabase/`). Run `schema.sql`, then `rls.sql`, then `seed.sql` in the
Supabase SQL editor, in that order. If you previously ran an older,
reconstructed version of these files against this project, run
`00-reset-old-setup.sql` first.
