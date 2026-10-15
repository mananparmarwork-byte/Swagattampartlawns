/**
 * Browser client for the Swagattam reviews Worker (see /reviews-worker).
 * Only talks to OUR backend. No Google keys or tokens are ever present in the browser.
 */

export type GoogleReview = {
  id: string;
  author: string;
  photoUrl: string | null;
  authorUrl: string | null;
  rating: number;
  text: string;
  createdAt: string | null;
  updatedAt: string | null;
  relativeTime?: string | null;
};

export type ReviewsPayload = {
  ok: true;
  source: 'business-profile' | 'places';
  attribution: string;
  /** Only Business Profile data may be kept in the browser as an offline fallback. */
  cacheable: boolean;
  rating: number | null;
  totalReviews: number | null;
  reviews: GoogleReview[];
  lastSyncedAt: string | null;
  stale: boolean;
  listingUrl: string | null;
  reviewsUrl: string | null;
};

export type LoadResult = { data: ReviewsPayload; fromCache: boolean };

const CACHE_KEY = 'swagattam:google-reviews:v1';
const TRIES = 3;
const TIMEOUT_MS = 8000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readCache(): ReviewsPayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReviewsPayload;
    return parsed && parsed.ok && Array.isArray(parsed.reviews) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(data: ReviewsPayload) {
  try {
    if (data.cacheable) window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable (private mode / quota): ignore */
  }
}

async function fetchOnce(url: string): Promise<ReviewsPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ReviewsPayload;
    if (!data || data.ok !== true || !Array.isArray(data.reviews)) throw new Error('Unexpected response');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Loads reviews with retry + backoff; falls back to the last good copy stored in this browser. */
export async function loadReviews(url: string): Promise<LoadResult> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    try {
      const data = await fetchOnce(url);
      writeCache(data);
      return { data, fromCache: false };
    } catch (error) {
      lastError = error;
      if (attempt < TRIES) await wait(700 * 2 ** (attempt - 1));
    }
  }
  const cached = readCache();
  if (cached) return { data: cached, fromCache: true };
  throw lastError instanceof Error ? lastError : new Error('Reviews unavailable');
}
