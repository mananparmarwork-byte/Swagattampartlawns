// Run with: npm test   (Node 20+; no dependencies)
// Google's HTTP APIs are mocked, so this verifies OUR logic (pagination, dedupe, diffing,
// failure fallback, security) — not that your Google account is approved. See SETUP.md for the live check.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { runSync, cleanComment, dedupeReviews, diffReviews, resolveProvider } from '../src/index.js';

class FakeKV {
  constructor() { this.m = new Map(); }
  async get(k, type) { const v = this.m.get(k); return v == null ? null : type === 'json' ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, v); }
}

const baseEnv = () => ({
  REVIEWS_KV: new FakeKV(),
  GBP_CLIENT_ID: 'id', GBP_CLIENT_SECRET: 'secret', GBP_REFRESH_TOKEN: 'refresh',
  GBP_ACCOUNT_ID: '111', GBP_LOCATION_ID: '222',
  PLACE_ID: 'ChIJTEST', GOOGLE_MAPS_URL: 'https://maps.app.goo.gl/EpFZA2uc5qEnWgeA9',
  ALLOWED_ORIGINS: 'https://swagattampartylawns.in, https://www.swagattampartylawns.in',
  SYNC_TOKEN: 'sync-secret',
});

const gbpReview = (id, name, stars, comment, create, update = create, extra = {}) => ({
  name: `accounts/111/locations/222/reviews/${id}`, reviewId: id,
  reviewer: { displayName: name, profilePhotoUrl: `https://lh3.googleusercontent.com/${id}`, ...extra },
  starRating: stars, comment, createTime: create, updateTime: update,
});

let handlers;
const realFetch = globalThis.fetch;
function mockGoogle(fn) { handlers = fn; }
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.startsWith('https://oauth2.googleapis.com/token')) return handlers.token?.(init) ?? Response.json({ access_token: 'tok' });
  return handlers.api(u, init);
};
test.after(() => { globalThis.fetch = realFetch; });

const page1 = {
  averageRating: 4.8, totalReviewCount: 4, nextPageToken: 'p2',
  reviews: [
    gbpReview('a1', 'Riya Shah', 'FIVE', 'Beautiful lawn, perfect for our wedding.', '2026-09-01T10:00:00Z'),
    gbpReview('a2', 'Anon', 'FIVE', 'Great.', '2026-08-01T10:00:00Z', '2026-08-01T10:00:00Z', { isAnonymous: true }),
  ],
};
const page2 = {
  averageRating: 4.8, totalReviewCount: 4,
  reviews: [
    gbpReview('a3', 'Kunal', 'FOUR', '(Translated by Google)\nVery good\n\n(Original)\nબહુ સરસ જગ્યા', '2026-07-01T10:00:00Z'),
    gbpReview('a4', 'Silent Star', 'FIVE', '', '2026-06-01T10:00:00Z'), // rating only
    gbpReview('a1', 'Riya Shah', 'FIVE', 'Beautiful lawn, perfect for our wedding.', '2026-09-01T10:00:00Z'), // duplicate across pages
  ],
};

function pagedApi(p1, p2) {
  return async (u) => (u.includes('pageToken=p2') ? Response.json(p2) : Response.json(p1));
}

test('provider resolution', () => {
  assert.equal(resolveProvider(baseEnv()), 'business-profile');
  assert.equal(resolveProvider({ PLACES_API_KEY: 'k', PLACE_ID: 'x' }), 'places');
  assert.equal(resolveProvider({}), 'none');
});

test('cleanComment prefers the original text', () => {
  assert.equal(cleanComment('(Translated by Google)\nVery good\n\n(Original)\nબહુ સરસ'), 'બહુ સરસ');
  assert.equal(cleanComment('  plain  '), 'plain');
});

test('sync: paginates, dedupes, stores, and serves a clean public payload', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  const r = await runSync(env, 'test');
  assert.equal(r.ok, true);
  assert.equal(r.stored, 4); // a1 de-duplicated
  assert.equal(r.added, 4);

  const res = await worker.fetch(new Request('https://w/api/reviews', { headers: { Origin: 'https://swagattampartylawns.in' } }), env, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://swagattampartylawns.in');
  const body = await res.json();
  assert.equal(body.source, 'business-profile');
  assert.equal(body.rating, 4.8);
  assert.equal(body.totalReviews, 4);
  assert.equal(body.cacheable, true);
  assert.equal(body.reviews.length, 3); // rating-only review is not shown but still counted in the total
  assert.equal(body.reviews[0].author, 'Riya Shah'); // newest first
  assert.equal(body.reviews.find((x) => x.id === 'a2').author, 'A Google user');
  assert.equal(body.reviews.find((x) => x.id === 'a2').photoUrl, null);
  assert.equal(body.reviews.find((x) => x.id === 'a3').text, 'બહુ સરસ જગ્યા');
  assert.ok(!('hash' in body.reviews[0]), 'internal hash must not leak');
  const raw = JSON.stringify(body);
  for (const secret of ['secret', 'refresh', 'sync-secret']) assert.ok(!raw.includes(secret));
});

test('sync: detects new, edited and deleted reviews', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'first');

  const changed = {
    averageRating: 4.7, totalReviewCount: 4,
    reviews: [
      gbpReview('a5', 'New Guest', 'FIVE', 'Brand new review', '2026-10-10T10:00:00Z'),
      gbpReview('a1', 'Riya Shah', 'FIVE', 'Beautiful lawn, perfect for our wedding. UPDATED', '2026-09-01T10:00:00Z', '2026-10-05T10:00:00Z'),
      gbpReview('a3', 'Kunal', 'FOUR', 'Very good', '2026-07-01T10:00:00Z'),
      gbpReview('a4', 'Silent Star', 'FIVE', '', '2026-06-01T10:00:00Z'),
      // a2 deleted
    ],
  };
  mockGoogle({ api: async () => Response.json(changed) });
  const r = await runSync(env, 'second');
  assert.deepEqual({ added: r.added, updated: r.updated, removed: r.removed }, { added: 1, updated: 2, removed: 1 });
});

test('failure keeps previous reviews, records the error, never throws', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  mockGoogle({ api: async () => new Response('boom', { status: 500 }) });
  const r = await runSync(env, 'fail');
  assert.equal(r.ok, false);
  assert.equal(r.keptReviews, 4);
  const res = await worker.fetch(new Request('https://w/api/reviews'), env, {});
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.reviews.length, 3, 'cached reviews still served');
  const health = await (await worker.fetch(new Request('https://w/api/health'), env, {})).json();
  assert.ok(health.lastError?.at && !health.lastError.message, 'public health hides the error text');
}, { timeout: 15000 });

test('OAuth failure keeps data and hides the token response', async () => {
  const env = { ...baseEnv(), GBP_REFRESH_TOKEN: 'rt-9f3a1c', GBP_CLIENT_SECRET: 'cs-77b1e0' };
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  mockGoogle({ token: () => Response.json({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, { status: 400 }), api: async () => { throw new Error('unreachable'); } });
  const r = await runSync(env, 'fail');
  assert.equal(r.ok, false);
  assert.match(r.error, /invalid_grant/);
  assert.doesNotMatch(r.error, /expired or revoked/); assert.ok(!r.error.includes(env.GBP_REFRESH_TOKEN) && !r.error.includes(env.GBP_CLIENT_SECRET));
});

test('suspicious empty result does not wipe stored reviews', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  mockGoogle({ api: async () => Response.json({ averageRating: 4.8, totalReviewCount: 4, reviews: [] }) });
  const r = await runSync(env, 'empty');
  assert.equal(r.ok, false);
  assert.equal(r.keptReviews, 4);
});

test('incomplete pagination never replaces data', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  // API keeps returning a nextPageToken forever
  mockGoogle({ api: async () => Response.json({ ...page1, nextPageToken: 'again' }) });
  const r = await runSync(env, 'loop');
  assert.equal(r.ok, false);
  assert.equal(r.keptReviews, 4);
});

test('CORS: unknown origins get no allow header', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  const res = await worker.fetch(new Request('https://w/api/reviews', { headers: { Origin: 'https://evil.example' } }), env, {});
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('/api/sync requires the bearer token', async () => {
  const env = baseEnv();
  mockGoogle({ api: pagedApi(page1, page2) });
  assert.equal((await worker.fetch(new Request('https://w/api/sync', { method: 'POST' }), env, {})).status, 401);
  assert.equal((await worker.fetch(new Request('https://w/api/sync', { method: 'POST', headers: { Authorization: 'Bearer nope' } }), env, {})).status, 401);
  assert.equal((await worker.fetch(new Request('https://w/api/sync', { method: 'GET', headers: { Authorization: 'Bearer sync-secret' } }), env, {})).status, 404);
  const ok = await worker.fetch(new Request('https://w/api/sync', { method: 'POST', headers: { Authorization: 'Bearer sync-secret' } }), env, {});
  assert.equal(ok.status, 200);
  const noSecretEnv = { ...baseEnv(), SYNC_TOKEN: '' };
  assert.equal((await worker.fetch(new Request('https://w/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' } }), noSecretEnv, {})).status, 401);
});

test('MIN_STAR filter only affects what is displayed, not the count', async () => {
  const env = { ...baseEnv(), MIN_STAR: '5' };
  mockGoogle({ api: pagedApi(page1, page2) });
  await runSync(env, 'ok');
  const body = await (await worker.fetch(new Request('https://w/api/reviews'), env, {})).json();
  assert.ok(body.reviews.every((r) => r.rating === 5));
  assert.equal(body.totalReviews, 4);
});

test('places mode: maps live response, attributes Google Maps, is not browser-cacheable', async () => {
  const cacheStore = new Map();
  globalThis.caches = { default: { match: async (k) => cacheStore.get(k.url), put: async (k, v) => { cacheStore.set(k.url, v); } } };
  const env = { PLACES_API_KEY: 'k', PLACE_ID: 'ChIJTEST', ALLOWED_ORIGINS: 'https://swagattampartylawns.in', GOOGLE_MAPS_URL: 'https://maps.app.goo.gl/x', PROVIDER: 'places' };
  let seenHeaders;
  mockGoogle({
    api: async (u, init) => {
      seenHeaders = init.headers;
      assert.ok(u.startsWith('https://places.googleapis.com/v1/places/ChIJTEST'));
      return Response.json({
        rating: 4.6, userRatingCount: 120,
        reviews: [{ name: 'places/ChIJTEST/reviews/r1', rating: 5, text: { text: 'Lovely venue' }, originalText: { text: 'Lovely venue' }, publishTime: '2026-09-02T00:00:00Z', relativePublishTimeDescription: 'a month ago', authorAttribution: { displayName: 'Meera', uri: 'https://www.google.com/maps/contrib/1', photoUri: 'https://lh3.googleusercontent.com/p' } }],
      });
    },
  });
  const res = await worker.fetch(new Request('https://w/api/reviews'), env, { waitUntil: (p) => p });
  const body = await res.json();
  assert.equal(body.source, 'places');
  assert.equal(body.attribution, 'Google Maps');
  assert.equal(body.cacheable, false);
  assert.equal(body.totalReviews, 120);
  assert.equal(body.reviews[0].authorUrl, 'https://www.google.com/maps/contrib/1');
  assert.equal(seenHeaders['X-Goog-Api-Key'], 'k');
  assert.ok(!JSON.stringify(body).includes('"k"'));
  // sync is a no-op in places mode (nothing is stored)
  assert.equal((await runSync(env)).skipped, true);
});

test('dedupe + diff helpers', () => {
  const a = { id: '1', author: 'x', createdAt: 't', updatedAt: '1', text: 'hi', rating: 5, hash: 'h1' };
  const b = { id: '2', author: 'x', createdAt: 't', updatedAt: '2', text: 'hi', rating: 5, hash: 'h2' }; // same person/time/text, new id
  assert.equal(dedupeReviews([a, b, { ...a }]).length, 1);
  assert.deepEqual(diffReviews([a], [{ ...a, hash: 'changed' }]), { added: 0, updated: 1, removed: 0 });
});
