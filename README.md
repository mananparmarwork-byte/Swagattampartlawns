# Event Estimate Studio (estimator only)

Banquet / party plot quotation software. The marketing landing page has been
removed — this repo is only the estimator + admin app.

- `/111` customer estimator
- `/999` admin panel (sign-in required)
- `/` shows the 404 page for now (will become login / dashboard in the subscription version)

## Setup
1. Supabase SQL Editor: run `supabase/schema.sql`, `rls.sql`, then the numbered files `01` … `06` in order (`seed.sql` optional).
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. GitHub → Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `CUSTOM_DOMAIN`.
4. Push to `main`; the workflow builds and deploys.

## Local
```bash
cp .env.example .env.local
npm install
npm run dev
```
