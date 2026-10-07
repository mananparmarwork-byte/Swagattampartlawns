# Technical handover for ChatGPT

## Project overview

Swagattam Party Lawns is a responsive, static venue website for weddings,
receptions, engagements, haldi, sangeet, baby showers, and other celebrations
in Vadodara. It presents venue information, local image galleries, contact
details, Google Maps, Instagram links, and an enquiry form that opens a
pre-filled WhatsApp message.

## Final architecture

```text
User
  ↓
GitHub Pages (custom domain)
  ↓
Static React/Vite frontend
  ↓
Optional future Supabase browser client
```

The current production feature set does not need Supabase or a server. The
external estimator and admin pages may be hosted separately and linked with
`VITE_ESTIMATOR_URL` and `VITE_ADMIN_URL`. Exact same-domain path routing
requires a reverse proxy or edge router because GitHub Pages is static.

## File structure

- `src/App.tsx` — page sections, galleries, forms, navigation, and external
  page handling.
- `src/index.css` — design tokens, responsive layout, and animations.
- `src/siteConfig.ts` — venue contact data and build-time external URLs.
- `src/components/` — reusable UI and error boundary components.
- `public/media/` — all static venue and brand assets.
- `vite.config.ts` — standalone Vite configuration with configurable base path.
- `scripts/copy-404.mjs` — creates the GitHub Pages SPA fallback.
- `.github/workflows/deploy.yml` — GitHub Pages deployment.
- `supabase/` — database/RLS plan for future persisted features.
- `migration-backup/` — archive-only original Replit server/config.

## Supabase setup

No Supabase project is required for the current build. If a future feature
needs data:

1. Create a Supabase project.
2. Copy its project URL and anon/public key.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the GitHub Actions
   environment or repository secrets.
4. Add only the necessary tables to `supabase/schema.sql`.
5. Enable RLS and add least-privilege policies to `supabase/rls.sql`.
6. Add an explicit browser client and feature-specific calls.
7. Test anonymous, authenticated, and unauthorized cases before deployment.

Never expose a service-role key in frontend code.

## Database tables

There are currently no application tables. The website does not persist form
submissions; the enquiry action opens WhatsApp. Do not invent a bookings,
users, or admin table until the external estimator/admin requirements define
the data ownership and access rules.

## Authentication

There is no authentication in this export. If the external admin page needs
authentication, keep that authentication inside the admin application or add
Supabase Auth there with database RLS. Do not protect an admin page with only a
client-side flag.

## Storage

There are no uploads in this export. All images and video are static files in
`public/media/`. If future uploads are required, use Supabase Storage with
private/public bucket decisions and storage policies documented before coding.

## Frontend connections

- Contact form → `Home.handleSubmit()` → WhatsApp deep link → pre-filled
  enquiry message opens in a new tab.
- Call actions → `siteConfig.phoneHref` → phone dialer on supported devices.
- WhatsApp actions → `siteConfig.whatsappHref` → WhatsApp.
- Map → `siteConfig.googleMapsEmbedUrl` → embedded map.
- Gallery cards → local files under `public/media/` → modal photo gallery.
- Event estimator link → `siteConfig.estimatorUrl` → configured external page.
- Admin portal link → `siteConfig.adminUrl` → configured external page.

## Deployment to GitHub Pages

1. Create a GitHub repository and copy the contents of this folder into it.
2. Keep `package.json`, `pnpm-lock.yaml` (if generated), `src/`, `public/`,
   `vite.config.ts`, and the workflow together at repository root.
3. In repository variables, set `CUSTOM_DOMAIN` if GitHub Actions should write
   `dist/CNAME` automatically.
4. In repository variables, set `VITE_ESTIMATOR_URL` and `VITE_ADMIN_URL` to
   the absolute external URLs, or leave them as path values when an edge
   router owns `/estimator` and `/admin`.
5. Enable **Settings → Pages → GitHub Actions**.
6. Push to the `main` branch. The workflow installs dependencies, runs
   typecheck, builds the static site, and deploys `dist/`.
7. Configure the custom domain and DNS records in GitHub Pages.
8. Test the home page, every asset/gallery, the contact links, and both
   external page paths.

For a project Pages URL instead of a custom domain, set
`VITE_BASE_PATH=/REPOSITORY_NAME/` before building.

## Troubleshooting

- **Blank page:** verify `VITE_BASE_PATH` ends with `/` and matches the Pages
  URL; custom domains should use `/`.
- **Images missing:** check that the build uses the correct base path and that
  filenames with spaces still exist under `public/media/`.
- **Refresh gives 404:** the build creates `dist/404.html`; confirm it was
  deployed and that GitHub Pages is serving the latest workflow artifact.
- **External path does not open:** set absolute `VITE_ESTIMATOR_URL` and
  `VITE_ADMIN_URL`, or configure a reverse proxy for the same-domain paths.
- **Supabase connection denied:** confirm the anon key is used, RLS policies
  match the request, and no service-role key was placed in frontend code.
- **GitHub Pages build fails:** run `pnpm install`, `pnpm run typecheck`, and
  `pnpm run build` locally before pushing.

## ChatGPT handover instructions

You are assisting the user with deploying this project using GitHub Pages for
the frontend and Supabase for backend functionality. Read this file first. Do
not tell the user to use the Replit backend. Guide the user one step at a time
and verify each step before moving to the next.

The `migration-backup/` folder contains the original implementation of
functionality that was migrated or removed from the active application. It is
archive-only. Do not restore it automatically or import it into the production
frontend.