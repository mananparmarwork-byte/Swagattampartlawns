import { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from '@/siteConfig';
import { loadReviews, type GoogleReview, type ReviewsPayload } from '@/lib/google-reviews';

type View =
  | { status: 'loading' }
  | { status: 'ready'; data: ReviewsPayload; fromCache: boolean }
  | { status: 'error' }
  | { status: 'unconfigured' };

const STAR_PATH = 'M12 2.5l2.95 6.2 6.8.9-5 4.7 1.25 6.7L12 17.7 6 21l1.25-6.7-5-4.7 6.8-.9L12 2.5z';

function Stars({ value, size = 18, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(5, value)) * 20;
  const row = (cls: string) => (
    <span className={cls} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width={size} height={size}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
  return (
    <span className="greviews-stars" role="img" aria-label={label ?? `${value} out of 5 stars`}>
      {row('greviews-stars-base')}
      <span className="greviews-stars-fill" style={{ width: `${pct}%` }}>
        {row('greviews-stars-row')}
      </span>
    </span>
  );
}

function formatDate(review: GoogleReview) {
  if (review.createdAt) {
    const d = new Date(review.createdAt);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(d);
    }
  }
  return review.relativeTime || '';
}

function formatUpdated(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'G';

function Avatar({ review }: { review: GoogleReview }) {
  const [failed, setFailed] = useState(false);
  if (review.photoUrl && !failed) {
    return (
      <img
        className="greviews-avatar"
        src={review.photoUrl}
        alt=""
        width={44}
        height={44}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="greviews-avatar greviews-avatar-fallback" aria-hidden="true">
      {initials(review.author)}
    </span>
  );
}

const LONG_TEXT = 230;

function ReviewCard({ review, index, total }: { review: GoogleReview; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > LONG_TEXT;
  const date = formatDate(review);
  return (
    <article className="greviews-card" role="group" aria-roledescription="slide" aria-label={`Review ${index + 1} of ${total}`} data-testid={`card-review-${index}`}>
      <div className="greviews-card-top">
        <Avatar review={review} />
        <div className="greviews-who">
          {review.authorUrl ? (
            <a className="greviews-name" href={review.authorUrl} target="_blank" rel="noopener noreferrer">
              {review.author}
            </a>
          ) : (
            <span className="greviews-name">{review.author}</span>
          )}
          {date && <span className="greviews-date">{date}</span>}
        </div>
      </div>
      <Stars value={review.rating} size={16} />
      <p className={`greviews-text${long && !expanded ? ' is-clamped' : ''}`}>{review.text}</p>
      {long && (
        <button type="button" className="greviews-more" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </article>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

function Carousel({ reviews }: { reviews: GoogleReview[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, progress: 0 });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({
      start: el.scrollLeft <= 2,
      end: max <= 2 || el.scrollLeft >= max - 2,
      progress: max > 0 ? Math.min(1, el.scrollLeft / max) : 1,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, reviews]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="greviews-carousel" role="region" aria-roledescription="carousel" aria-label="Guest reviews from Google">
      <div className="greviews-track" ref={trackRef} onScroll={measure} tabIndex={0}>
        {reviews.map((review, i) => (
          <ReviewCard key={review.id} review={review} index={i} total={reviews.length} />
        ))}
      </div>
      <div className="greviews-controls">
        <div className="greviews-progress" aria-hidden="true">
          <span style={{ width: `${Math.max(8, edge.progress * 100)}%` }} />
        </div>
        <div className="greviews-arrows">
          <button type="button" onClick={() => scrollByPage(-1)} disabled={edge.start} aria-label="Previous reviews" data-testid="button-reviews-prev">
            <Chevron dir="left" />
          </button>
          <button type="button" onClick={() => scrollByPage(1)} disabled={edge.end} aria-label="Next reviews" data-testid="button-reviews-next">
            <Chevron dir="right" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="greviews-track greviews-skeleton" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div className="greviews-card" key={i}>
          <div className="greviews-card-top">
            <span className="greviews-avatar greviews-shimmer" />
            <div className="greviews-who">
              <span className="greviews-line greviews-shimmer" style={{ width: '60%' }} />
              <span className="greviews-line greviews-shimmer" style={{ width: '30%' }} />
            </div>
          </div>
          <span className="greviews-line greviews-shimmer" style={{ width: '40%', height: 14 }} />
          <span className="greviews-line greviews-shimmer" />
          <span className="greviews-line greviews-shimmer" />
          <span className="greviews-line greviews-shimmer" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}

export function GoogleReviews() {
  const [view, setView] = useState<View>(() => (siteConfig.reviewsApiUrl ? { status: 'loading' } : { status: 'unconfigured' }));

  const load = useCallback(() => {
    if (!siteConfig.reviewsApiUrl) return;
    setView({ status: 'loading' });
    loadReviews(siteConfig.reviewsApiUrl)
      .then(({ data, fromCache }) => setView({ status: 'ready', data, fromCache }))
      .catch(() => setView({ status: 'error' }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const listingUrl = (view.status === 'ready' && view.data.listingUrl) || siteConfig.googleReviewsUrl;
  const data = view.status === 'ready' ? view.data : null;
  const hasSummary = Boolean(data && data.rating != null && data.totalReviews != null);
  const updated = data ? formatUpdated(data.lastSyncedAt) : '';
  const showSavedNote = Boolean(data && (data.stale || view.status === 'ready' && view.fromCache));

  return (
    <section className="greviews-section" id="reviews" aria-labelledby="reviews-title">
      <div className="section-wrap">
        <div className="greviews-head reveal">
          <span className="greviews-eyebrow">Google Reviews</span>
          <h2 id="reviews-title" className="font-display greviews-title">
            What Our <em>Guests Say</em>
          </h2>
        </div>

        <div className="greviews-summary reveal" data-testid="reviews-summary">
          {hasSummary && data ? (
            <>
              <div className="greviews-score">
                <strong className="font-display">{data.rating!.toFixed(1)}</strong>
                <div>
                  <Stars value={data.rating!} size={22} label={`Google rating ${data.rating!.toFixed(1)} out of 5`} />
                  <span className="greviews-count">
                    Based on {data.totalReviews!.toLocaleString('en-IN')} Google {data.totalReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>
              <a className="greviews-cta" href={listingUrl} target="_blank" rel="noopener noreferrer" data-testid="link-read-all-reviews">
                Read All Reviews on Google
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </a>
            </>
          ) : (
            <>
              <p className="greviews-fallback-copy">
                {view.status === 'loading'
                  ? 'Loading our latest Google reviews…'
                  : view.status === 'error'
                    ? 'Our live reviews are taking a moment to load. You can read every review directly on Google.'
                    : 'See what guests are saying about their celebrations at Swagattam on Google.'}
              </p>
              <a className="greviews-cta" href={listingUrl} target="_blank" rel="noopener noreferrer" data-testid="link-read-all-reviews">
                Read All Reviews on Google
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17L17 7M8 7h9v9" />
                </svg>
              </a>
            </>
          )}
        </div>

        {view.status === 'loading' && <CardSkeletons />}

        {view.status === 'ready' && view.data.reviews.length > 0 && <Carousel reviews={view.data.reviews} />}

        {view.status === 'ready' && view.data.reviews.length === 0 && (
          <p className="greviews-empty">Written reviews will appear here as soon as they are available.</p>
        )}

        {view.status === 'error' && (
          <div className="greviews-error" role="status">
            <button type="button" className="greviews-retry" onClick={load} data-testid="button-reviews-retry">
              Try again
            </button>
          </div>
        )}

        {data && (
          <p className="greviews-meta" data-testid="reviews-meta">
            {showSavedNote && 'Showing our most recently saved reviews. '}
            {updated ? `Last updated ${updated}. ` : ''}
            Reviews refresh automatically about every 12 hours, so very recent reviews may take a little while to appear.
            {' '}
            <span className="greviews-attrib">{data.source === 'places' ? 'Powered by Google Maps' : 'Reviews from Google'}</span>
          </p>
        )}
      </div>
    </section>
  );
}
