import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { GOOGLE_RATING, GOOGLE_REVIEW_COUNT, googleReviews } from '@/lib/googleReviews';

const AUTO_SLIDE_MS = 4500;

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="gr-stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} strokeWidth={1.5} className={n <= Math.round(value) ? 'on' : ''} />)}
    </span>
  );
}

function GoogleWord() {
  return (
    <span className="gr-google" aria-label="Google">
      <span style={{ color: '#4285f4' }}>G</span><span style={{ color: '#ea4335' }}>o</span><span style={{ color: '#fbbc05' }}>o</span><span style={{ color: '#4285f4' }}>g</span><span style={{ color: '#34a853' }}>l</span><span style={{ color: '#ea4335' }}>e</span>
    </span>
  );
}

export function GoogleReviews() {
  const trackRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  const step = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const amount = card.offsetWidth + 20;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    if (direction === 1 && atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
    else if (direction === -1 && track.scrollLeft <= 4) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
    else track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  // Slides by itself; pauses while the visitor hovers or touches, or when the tab is hidden.
  useEffect(() => {
    if (googleReviews.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => { if (!paused.current && !document.hidden) step(1); }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (googleReviews.length === 0) return null;
  const pause = () => { paused.current = true; };
  const resume = () => { paused.current = false; };

  return (
    <section className="reviews-section" id="reviews" aria-labelledby="reviews-title" data-testid="section-google-reviews">
      <div className="section-wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Loved by our guests</span>
            <h2 id="reviews-title" className="font-display">What our guests <em>say about us.</em></h2>
          </div>
          <div className="gr-badge">
            <GoogleWord />
            <strong>{GOOGLE_RATING.toFixed(1)}</strong>
            <span>
              <Stars value={GOOGLE_RATING} size={14} />
              <small>{GOOGLE_REVIEW_COUNT.toLocaleString('en-IN')} Google reviews</small>
            </span>
          </div>
        </div>

        <div className="gr-slider" onMouseEnter={pause} onMouseLeave={resume} onTouchStart={pause} onTouchEnd={() => window.setTimeout(resume, 6000)} onFocus={pause} onBlur={resume}>
          <div className="gr-track" ref={trackRef} data-testid="reviews-track">
            {googleReviews.map((review, index) => (
              <article className="gr-card" key={`${review.author}-${index}`} data-testid={`review-card-${index}`}>
                <header>
                  <span className="gr-avatar gr-avatar--letter" aria-hidden="true">{review.author.trim().charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{review.author}</strong>
                    {review.tag && <span>{review.tag}</span>}
                  </div>
                </header>
                <Stars value={review.rating} />
                <p>{review.text}</p>
                <footer>Posted on <GoogleWord /></footer>
              </article>
            ))}
          </div>
          {googleReviews.length > 1 && (
            <div className="gr-controls">
              <button type="button" onClick={() => step(-1)} aria-label="Previous review" data-testid="button-reviews-prev"><ChevronLeft size={18} /></button>
              <button type="button" onClick={() => step(1)} aria-label="Next review" data-testid="button-reviews-next"><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
