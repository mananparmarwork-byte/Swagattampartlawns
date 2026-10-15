/**
 * Swagattam Party Lawns — Google Reviews backend (Cloudflare Worker)
 *
 * Endpoints
 *   GET  /api/reviews  public, CORS-restricted JSON used by the landing page
 *   GET  /api/health   public, tiny status document (no secrets, no review data)
 *   POST /api/sync     protected by "Authorization: Bearer <SYNC_TOKEN>", runs a sync now
 *
 * A Cron Trigger (wrangler.toml) runs a sync every 12 hours.
 *
 * Two providers, chosen by PROVIDER (default "auto"):
 *   business-profile  Google Business Profile API -> full review history, stored in KV
 *   places            Places API (New)            -> max 5 reviews, fetched live, NOT stored
 *
 * Secrets never leave this Worker. See ../SETUP.md.
 */

const KV_KEY = 'reviews:v1';
const HOUR = 3600 * 1000;
const STALE_AFTER_MS = 36 * HOUR; // flag data as stale if no successful sync for 36h
const RESYNC_IF_OLDER_THAN_MS = 13 * HOUR; // self-heal if a cron run was missed
const PLACES_EDGE_TTL_SECONDS = 600; // short edge cache only (Places content may not be stored)
const STAR_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/* ------------------------------------------------------------------ helpers */

export function parseOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = (request.headers.get('Origin') || '').replace(/\/+$/, '');
  const headers = { Vary: 'Origin' };
  if (origin && parseOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(body, status, request, env, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(request, env),
      ...extra,
    },
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with retry + exponential backoff on network errors, 429 and 5xx. */
export async function fetchWithRetry(url, init = {}, { tries = 3, baseDelayMs = 500 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status !== 429 && res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < tries) await sleep(baseDelayMs * 2 ** (attempt - 1));
  }
  throw lastError;
}

function hasGbpConfig(env) {
  return Boolean(
    env.GBP_CLIENT_ID && env.GBP_CLIENT_SECRET && env.GBP_REFRESH_TOKEN && env.GBP_ACCOUNT_ID && env.GBP_LOCATION_ID,
  );
}

export function resolveProvider(env) {
  const wanted = String(env.PROVIDER || 'auto').toLowerCase();
  if (wanted === 'business-profile') return 'business-profile';
  if (wanted === 'places') return 'places';
  if (hasGbpConfig(env)) return 'business-profile';
  if (env.PLACES_API_KEY && env.PLACE_ID) return 'places';
  return 'none';
}

/* Google sometimes returns "(Translated by Google) … (Original) …". Prefer the guest's own words. */
export function cleanComment(raw) {
  let text = String(raw || '').trim();
  if (!text) return '';
  const idx = text.indexOf('(Original)');
  if (text.startsWith('(Translated by Google)') && idx !== -1) text = text.slice(idx + '(Original)'.length);
  return text.replace(/\s+\n/g, '\n').trim();
}

/* -------------------------------------------------------- Business Profile API */

async function getAccessToken(env) {
  const res = await fetchWithRetry('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GBP_CLIENT_ID,
      client_secret: env.GBP_CLIENT_SECRET,
      refresh_token: env.GBP_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // Never log or return the token response body verbatim; keep only the error code.
    throw new Error(`OAuth token refresh failed (${res.status}${data.error ? ` ${data.error}` : ''})`);
  }
  return data.access_token;
}

export function reviewHash(r) {
  return [r.rating, r.text, r.updatedAt, r.author].join('\u241f');
}

export function normalizeGbpReview(r) {
  const anonymous = Boolean(r.reviewer?.isAnonymous);
  const createdAt = r.createTime || r.updateTime || null;
  const review = {
    id: r.reviewId || String(r.name || '').split('/').pop(),
    author: anonymous ? 'A Google user' : r.reviewer?.displayName || 'A Google user',
    photoUrl: anonymous ? null : r.reviewer?.profilePhotoUrl || null,
    authorUrl: null,
    rating: STAR_MAP[r.starRating] || 0,
    text: cleanComment(r.comment),
    createdAt,
    updatedAt: r.updateTime || createdAt,
  };
  review.hash = reviewHash(review);
  return review;
}

export async function fetchGbpReviews(env) {
  const token = await getAccessToken(env);
  const base = `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(env.GBP_ACCOUNT_ID)}/locations/${encodeURIComponent(env.GBP_LOCATION_ID)}/reviews`;
  const all = [];
  let pageToken = '';
  let averageRating;
  let totalReviewCount;
  for (let page = 0; page < 60; page++) {
    const qs = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    if (pageToken) qs.set('pageToken', pageToken);
    const res = await fetchWithRetry(`${base}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Business Profile API error ${res.status}${data.error?.status ? ` ${data.error.status}` : ''}`);
    }
    if (typeof data.averageRating === 'number') averageRating = data.averageRating;
    if (typeof data.totalReviewCount === 'number') totalReviewCount = data.totalReviewCount;
    for (const r of data.reviews || []) all.push(normalizeGbpReview(r));
    pageToken = data.nextPageToken || '';
    if (!pageToken) {
      return { rating: averageRating, total: totalReviewCount ?? all.length, reviews: all, complete: true };
    }
  }
  // Ran out of pages without reaching the end: flag incomplete so partial data never replaces good data.
  return { rating: averageRating, total: totalReviewCount ?? all.length, reviews: all, complete: false };
}

/* ------------------------------------------------------- dedupe / change detection */

const fingerprint = (r) => [r.author, r.createdAt, r.text].join('\u241f').toLowerCase();

/** Drop exact duplicates (same id, or same author+time+text), keeping the most recently updated copy. */
export function dedupeReviews(list) {
  const byId = new Map();
  for (const r of list) {
    const prev = byId.get(r.id);
    if (!prev || String(r.updatedAt) > String(prev.updatedAt)) byId.set(r.id, r);
  }
  const byFp = new Map();
  for (const r of byId.values()) {
    const fp = fingerprint(r);
    const prev = byFp.get(fp);
    if (!prev || String(r.updatedAt) > String(prev.updatedAt)) byFp.set(fp, r);
  }
  return [...byFp.values()];
}

export function diffReviews(prevList, nextList) {
  const prev = new Map((prevList || []).map((r) => [r.id, r]));
  const next = new Map(nextList.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;
  let removed = 0;
  for (const [id, r] of next) {
    if (!prev.has(id)) added++;
    else if (prev.get(id).hash !== r.hash) updated++;
  }
  for (const id of prev.keys()) if (!next.has(id)) removed++;
  return { added, updated, removed };
}

/* ------------------------------------------------------------------ sync (GBP) */

export async function readState(env) {
  if (!env.REVIEWS_KV) return null;
  return env.REVIEWS_KV.get(KV_KEY, 'json');
}

async function writeState(env, state) {
  await env.REVIEWS_KV.put(KV_KEY, JSON.stringify(state));
}

/**
 * Fetch from Google, validate, dedupe, diff against what we have and persist.
 * On ANY failure the previously stored reviews are kept and only the error is recorded.
 */
export async function runSync(env, reason = 'cron') {
  const provider = resolveProvider(env);
  const now = new Date().toISOString();

  if (provider !== 'business-profile') {
    return { ok: true, skipped: true, reason: `provider "${provider}" does not store reviews; nothing to sync` };
  }
  if (!env.REVIEWS_KV) throw new Error('REVIEWS_KV binding is missing');

  const prev = (await readState(env)) || { version: 1, reviews: [] };
  try {
    const fetched = await fetchGbpReviews(env);
    if (!fetched.complete) throw new Error('Pagination did not finish; keeping previous reviews');
    const next = dedupeReviews(fetched.reviews);
    if (next.length === 0 && prev.reviews.length > 0 && fetched.total > 0) {
      throw new Error('Google returned zero reviews but the count is non-zero; keeping previous reviews');
    }
    const change = diffReviews(prev.reviews, next);
    const state = {
      version: 1,
      provider,
      rating: fetched.rating ?? prev.rating ?? null,
      total: fetched.total,
      reviews: next,
      lastSuccessAt: now,
      lastAttemptAt: now,
      lastError: null,
      lastChange: { ...change, at: now, reason },
      consecutiveFailures: 0,
    };
    await writeState(env, state);
    return { ok: true, ...change, total: state.total, stored: next.length };
  } catch (err) {
    const state = {
      ...prev,
      version: 1,
      provider,
      lastAttemptAt: now,
      lastError: { at: now, message: String(err?.message || err).slice(0, 300) },
      consecutiveFailures: (prev.consecutiveFailures || 0) + 1,
    };
    try {
      await writeState(env, state);
    } catch {
      /* KV unavailable: nothing more we can do */
    }
    return { ok: false, error: state.lastError.message, keptReviews: prev.reviews.length };
  }
}

/* ---------------------------------------------------------------- Places (live) */

export async function fetchPlacesLive(env) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(env.PLACE_ID)}`;
  const res = await fetchWithRetry(url, {
    headers: {
      'X-Goog-Api-Key': env.PLACES_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,googleMapsUri,reviews',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Places API error ${res.status}${data.error?.status ? ` ${data.error.status}` : ''}`);
  const reviews = (data.reviews || []).map((r) => ({
    id: r.name || `${r.authorAttribution?.displayName}-${r.publishTime}`,
    author: r.authorAttribution?.displayName || 'A Google user',
    photoUrl: r.authorAttribution?.photoUri || null,
    authorUrl: r.authorAttribution?.uri || null,
    rating: Number(r.rating) || 0,
    text: String(r.originalText?.text || r.text?.text || '').trim(),
    createdAt: r.publishTime || null,
    updatedAt: r.publishTime || null,
    relativeTime: r.relativePublishTimeDescription || null,
  }));
  return { rating: data.rating ?? null, total: data.userRatingCount ?? reviews.length, reviews };
}

/* ------------------------------------------------------------- public response */

export function buildPublicPayload(env, { provider, rating, total, reviews, lastSyncedAt, stale }) {
  const minStar = Math.min(5, Math.max(1, Number(env.MIN_STAR || 1)));
  const limit = Math.min(60, Math.max(1, Number(env.MAX_REVIEWS_PUBLIC || 24)));
  const shown = reviews
    .filter((r) => r.text && r.rating >= minStar)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)
    .map(({ hash, ...r }) => r); // never expose internal fields
  return {
    ok: true,
    source: provider,
    attribution: provider === 'places' ? 'Google Maps' : 'Google',
    cacheable: provider === 'business-profile', // Places content must not be kept in browser storage
    rating: rating == null ? null : Math.round(rating * 10) / 10,
    totalReviews: total ?? null,
    reviews: shown,
    lastSyncedAt: lastSyncedAt || null,
    stale: Boolean(stale),
    listingUrl: env.GOOGLE_MAPS_URL || null,
    reviewsUrl: env.PLACE_ID ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(env.PLACE_ID)}` : null,
  };
}

async function handleReviews(request, env, ctx) {
  const provider = resolveProvider(env);

  if (provider === 'none') {
    return json({ ok: false, error: 'not_configured' }, 503, request, env, { 'Cache-Control': 'no-store' });
  }

  if (provider === 'places') {
    const cache = caches.default;
    const cacheKey = new Request(`https://reviews-cache.internal/places/${env.PLACE_ID}`);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.json();
      return json(body, 200, request, env, { 'Cache-Control': 'public, max-age=300' });
    }
    try {
      const live = await fetchPlacesLive(env);
      const body = buildPublicPayload(env, { provider, ...live, lastSyncedAt: new Date().toISOString(), stale: false });
      ctx?.waitUntil?.(
        cache.put(
          cacheKey,
          new Response(JSON.stringify(body), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${PLACES_EDGE_TTL_SECONDS}` },
          }),
        ),
      );
      return json(body, 200, request, env, { 'Cache-Control': 'public, max-age=300' });
    } catch {
      return json({ ok: false, error: 'upstream_error' }, 502, request, env, { 'Cache-Control': 'no-store' });
    }
  }

  // business-profile: serve from KV; sync inline only if we have never synced successfully
  let state = await readState(env);
  if (!state || !state.lastSuccessAt) {
    await runSync(env, 'first-request');
    state = await readState(env);
  } else if (Date.now() - Date.parse(state.lastSuccessAt) > RESYNC_IF_OLDER_THAN_MS) {
    ctx?.waitUntil?.(runSync(env, 'self-heal'));
  }
  if (!state || !state.lastSuccessAt) {
    return json({ ok: false, error: 'no_data_yet' }, 503, request, env, { 'Cache-Control': 'no-store' });
  }
  const stale = Date.now() - Date.parse(state.lastSuccessAt) > STALE_AFTER_MS;
  const body = buildPublicPayload(env, {
    provider,
    rating: state.rating,
    total: state.total,
    reviews: state.reviews,
    lastSyncedAt: state.lastSuccessAt,
    stale,
  });
  return json(body, 200, request, env, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' });
}

async function handleHealth(request, env) {
  const provider = resolveProvider(env);
  const state = provider === 'business-profile' ? await readState(env) : null;
  return json(
    {
      ok: provider !== 'none',
      provider,
      hasData: Boolean(state?.lastSuccessAt),
      lastSuccessAt: state?.lastSuccessAt || null,
      lastAttemptAt: state?.lastAttemptAt || null,
      lastError: state?.lastError ? { at: state.lastError.at } : null, // message stays private
      stored: state?.reviews?.length ?? 0,
    },
    200,
    request,
    env,
    { 'Cache-Control': 'no-store' },
  );
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function handleSync(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!env.SYNC_TOKEN || !token || !timingSafeEqual(token, env.SYNC_TOKEN)) {
    return json({ ok: false, error: 'unauthorized' }, 401, request, env, { 'Cache-Control': 'no-store' });
  }
  const result = await runSync(env, 'manual');
  const state = await readState(env);
  // The authenticated caller may see the detailed error to debug setup.
  return json({ ...result, lastError: state?.lastError || null }, result.ok ? 200 : 502, request, env, {
    'Cache-Control': 'no-store',
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    if (url.pathname === '/api/reviews' && request.method === 'GET') return handleReviews(request, env, ctx);
    if (url.pathname === '/api/health' && request.method === 'GET') return handleHealth(request, env);
    if (url.pathname === '/api/sync' && request.method === 'POST') return handleSync(request, env);
    return json({ ok: false, error: 'not_found' }, 404, request, env);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runSync(env, 'cron').then((r) =>
        console.log('review sync', JSON.stringify({ ok: r.ok, added: r.added, updated: r.updated, removed: r.removed })),
      ),
    );
  },
};
