# Swagattam Party Lawns — GitHub Pages export

This folder is a standalone static React/Vite export of the Swagattam Party
Lawns venue website. It does not require the Replit runtime, an Express server,
or the Replit API server in order to run.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm run dev
```

For a production build:

```bash
pnpm run typecheck
pnpm run build
pnpm run preview
```

The generated static files are in `dist/`.

## Custom domain

1. Copy `.env.example` to `.env.local`.
2. Keep `VITE_BASE_PATH=/` for a custom domain.
3. Copy `public/CNAME.example` to `public/CNAME` and replace its contents with
   the exact domain, for example `www.example.com`.
4. In GitHub, open **Settings → Pages**, choose **GitHub Actions**, and add
   the custom domain in the Pages settings.
5. At the DNS provider, point the domain to the GitHub Pages records shown by
   GitHub. Use the exact records GitHub provides for the repository.

The workflow in `.github/workflows/deploy.yml` also supports a repository
variable named `CUSTOM_DOMAIN`; when present, it writes that value to
`dist/CNAME` during deployment.

## External `/estimator` and `/admin` pages

GitHub Pages can host this website, but it cannot proxy arbitrary URL paths to
two different external servers. There are two supported arrangements:

### External URLs

Set these before building:

```bash
VITE_ESTIMATOR_URL=https://estimator.example.com
VITE_ADMIN_URL=https://admin.example.com
```

The footer links will open the independently hosted pages. If someone visits
`/estimator` or `/admin` directly on the GitHub Pages domain, the generated
`404.html` loads the app and redirects to the configured absolute URL.

### Same-domain paths

If the required public URLs must remain exactly
`https://your-domain.example/estimator` and
`https://your-domain.example/admin`, put a reverse proxy or edge router in
front of GitHub Pages. Route `/` to this GitHub Pages site and route the two
path prefixes to the external applications. Keep the two environment values
as `/estimator` and `/admin` when the proxy owns those paths.

## Supabase status

The current website does not save enquiries, authenticate users, upload files,
or call a backend API. It opens a WhatsApp message containing the form details.
Because there is no active application data to migrate, `supabase/schema.sql`
and `supabase/rls.sql` intentionally contain no invented tables.

`.env.example` reserves browser-safe `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` variables for a future feature. Never put a Supabase
service-role key in this frontend.

## Important files

- `src/` — React website source and venue UI.
- `public/media/` — static venue, logo, gallery, QR, and video assets.
- `vite.config.ts` — GitHub Pages-compatible Vite configuration.
- `.github/workflows/deploy.yml` — build and deploy workflow.
- `.env.example` — public build configuration placeholders.
- `supabase/` — reviewed database/RLS plan; no tables are currently required.
- `migration-backup/` — archive-only copy of the original Replit server/config.
- `README_FOR_CHATGPT.md` — detailed handover instructions.
- `SUPABASE_SETUP_CHECKLIST.md` — setup checklist for future Supabase work.

## No secrets included

This export contains no real secrets, tokens, passwords, or service-role keys.