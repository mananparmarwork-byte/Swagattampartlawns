# Google Reviews — setup guide

Website stays on GitHub Pages. A small **Cloudflare Worker** (free plan is enough) talks to Google, keeps
the reviews, and refreshes them **every 12 hours** via a Cron Trigger. The website only ever calls the Worker.
No Google key or token is ever in the website code or this repo.

## 0. Which Google API? (read this first)

| | **Business Profile API** (preferred) | **Places API (New)** (works today) |
|---|---|---|
| Reviews returned | **All** reviews, paginated, with edits/deletions | **Max 5** per request, chosen by Google |
| Needs | You own/manage the *verified* listing **and** Google approves your API access request (can take days–weeks; not guaranteed for single-location owners) | A Google Cloud project with billing + an API key |
| Rating + total count | Yes | Yes |
| Storing reviews | Allowed for your own profile data; the Worker keeps them in KV and replaces them on every sync (so deleted reviews disappear) | Google's terms **restrict storing/caching Places content** (Place ID is the exception). The Worker therefore does *not* store anything — it fetches live and keeps a ≤10-minute edge cache only |
| 12-hour scheduled sync | Yes | Not applicable (nothing is stored; each visit gets near-live data) |
| Fallback when Google fails | Last saved copy (server + browser) | Website shows the rating-less fallback with the Google button |
| Required attribution | "Reviews from Google" | "Powered by Google Maps" + links to each reviewer (already built in) |

The Worker picks automatically: Business Profile if its secrets exist, otherwise Places if a key exists.
**Recommended path:** start with Places today, apply for Business Profile access in parallel, switch when approved
(just add the secrets — no redeploy of the website).

Neither API gives instant updates. New reviews usually appear within the 12-hour window (Business Profile) or within
minutes (Places, subject to Google's own delay). Never promise "instant".

## 1. Confirm your Place ID

Your Maps link resolves to **Swagattam Party Lawns with AC Banquet Hall**. The Place ID in `wrangler.toml`
(`ChIJM_OfUyTJXzkR3_KOFDu-3vY`) was **derived from the link's internal ID and has not been confirmed by Google yet**.
Confirm it either way:

* Open <https://developers.google.com/maps/documentation/places/web-service/place-id>, search for the business and
  compare the ID, **or**
* Run the Business Profile helper in step 4 — it prints Google's official Place ID for your location.

If different, edit `PLACE_ID` in `wrangler.toml`.

## 2. Cloudflare (one time)

```bash
cd reviews-worker
npm install
npx wrangler login
npx wrangler kv namespace create REVIEWS_KV     # copy the printed id into wrangler.toml
npm test                                        # 13 tests should pass
npx wrangler deploy                             # prints https://swagattam-reviews.<you>.workers.dev
```

Set a private token that protects manual sync (pick any long random string):

```bash
npx wrangler secret put SYNC_TOKEN
```

## 3A. Places API (fastest)

1. <https://console.cloud.google.com> → create/select a project → enable billing.
2. APIs & Services → Library → enable **Places API (New)**.
3. Credentials → Create API key → **Restrict key → API restrictions → Places API (New) only**.
   (Workers have no fixed IP, so restrict by API; set a low quota/budget alert too.)
4. `npx wrangler secret put PLACES_API_KEY`
5. If you have a privacy policy page, mention that the site uses Google Maps APIs (Google's terms require this for Places API).

## 3B. Business Profile API (full reviews)

1. Make sure the listing is **verified** and your Google account is **Owner/Manager** of it
   (<https://business.google.com>). Google asks that the listing has existed for 60+ days.
2. Same Cloud project: request access with Google's **Business Profile API access request form**
   (search: "Google Business Profile API access request"; choose *Application for Basic API Access*).
   Wait for the approval email. Until then, API calls return quota errors.
3. After approval, enable: *My Business Account Management API*, *My Business Business Information API*,
   and *Google My Business API* (the reviews API; it only appears once approved).
4. APIs & Services → OAuth consent screen: set it up, then **publish it ("In production")**.
   If you leave it in *Testing*, Google expires the refresh token after **7 days** and reviews silently stop syncing.
5. Credentials → Create OAuth client ID → **Desktop app**. Copy the client ID and secret.
6. On your own computer (never in CI):
   ```bash
   GBP_CLIENT_ID=... GBP_CLIENT_SECRET=... node scripts/get-refresh-token.mjs
   ```
   Open the printed URL, approve, and the script prints `GBP_REFRESH_TOKEN`, your `GBP_ACCOUNT_ID`,
   `GBP_LOCATION_ID` and the official Place ID.
7. Store all five as Worker secrets (each command prompts for the value):
   ```bash
   npx wrangler secret put GBP_CLIENT_ID
   npx wrangler secret put GBP_CLIENT_SECRET
   npx wrangler secret put GBP_REFRESH_TOKEN
   npx wrangler secret put GBP_ACCOUNT_ID
   npx wrangler secret put GBP_LOCATION_ID
   ```

## 4. Verify the backend with REAL data

```bash
W=https://swagattam-reviews.<you>.workers.dev
curl -s $W/api/health                      # provider should be "business-profile" or "places"
curl -s -X POST $W/api/sync -H "Authorization: Bearer <SYNC_TOKEN>"    # Business Profile only
curl -s $W/api/reviews | head -c 800       # real rating, total count, reviews
```

Check the numbers against your Google Maps listing. If `/api/sync` fails, its JSON `lastError.message` says why
(`invalid_grant` = token expired/revoked, `403/PERMISSION_DENIED` = access not approved or wrong account,
`429` = quota not granted yet).

The cron schedule (`0 */12 * * *`, UTC) is created automatically by `wrangler deploy`. Cloudflare dashboard →
Workers → swagattam-reviews → Triggers shows it. If a run is ever missed, the next visitor request re-syncs in the background.

## 5. Publish the website

1. GitHub → repo → Settings → Secrets and variables → Actions → **Variables** → New:
   `VITE_REVIEWS_API_URL` = `https://swagattam-reviews.<you>.workers.dev/api/reviews` (public, not a secret).
2. Your existing `.github/workflows/deploy.yml` must pass it into the **site** build. Under the step that builds
   `site/`, make sure the `env:` block contains:
   ```yaml
   env:
     VITE_REVIEWS_API_URL: ${{ vars.VITE_REVIEWS_API_URL }}
   ```
   (Alternative without touching the workflow: paste the URL into `reviewsApiUrl` in `site/src/siteConfig.ts`.)
3. Commit and push to `main`. Until the URL is set, the section shows a safe fallback with the Google button, no fake data.
4. If your site is served from a different domain than `swagattampartylawns.in` / `www.`, add it to
   `ALLOWED_ORIGINS` in `wrangler.toml` and redeploy the Worker.

Optional: `.github/workflows/deploy-reviews-worker.yml` redeploys the Worker on changes using the repo secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

## 6. Settings you may want

* `MIN_STAR` (wrangler.toml): `"1"` shows every written review. Set `"4"` to display only 4–5★ — the headline
  rating and count always remain Google's real numbers. Be aware that hiding lower reviews is your call; Google's
  guidance is about not *soliciting* only happy customers, but visitors may notice.
* `MAX_REVIEWS_PUBLIC`: how many cards the carousel gets (default 24).

## Security recap

* Secrets live only in Cloudflare (`wrangler secret put`). `.dev.vars` is git-ignored.
* `/api/sync` needs the bearer token; `/api/health` never exposes error text.
* CORS only allows your own domains.
* Don't put a Google key in any `VITE_*` variable — those are public.
