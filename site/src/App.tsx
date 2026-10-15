import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Instagram,
  LoaderCircle,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  X,
} from 'lucide-react';
import { siteConfig } from './siteConfig';

const queryClient = new QueryClient();
const media = (folder: string, file: string) =>
  `${import.meta.env.BASE_URL}media/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
const normalizedPathname = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
const formatEventDate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

type GalleryImage = { src: string; alt: string; category: string };
type Enquiry = {
  name: string;
  mobile: string;
  email: string;
  eventType: string;
  date: string;
  guests: string;
  area: string;
  message: string;
};

const propertyImages: GalleryImage[] = [
  ['swagattam-property-aerial.webp', 'Swagattam Party Lawns aerial venue view', 'Venue'],
  ['swagattam-property-carnival.webp', 'Swagattam Party Lawns decorated entrance', 'Venue'],
  ['20230330_073538.webp', 'Venue entrance and lighting', 'Venue'],
].map(([file, alt, category]) => ({
  src: media('Our Property', file),
  alt,
  category,
}));

type VideoItem = {
  src: string;
  poster: string;
  title: string;
  note: string;
  duration: string;
};

const videoItems: VideoItem[] = [
  {
    src: media('Videos', 'wedding-carnival-reel.mp4'),
    poster: media('Videos', 'wedding-carnival-reel.jpg'),
    title: 'Wedding Carnival Reel',
    note: 'A day to remember',
    duration: '0:31',
  },
  {
    src: media('Videos', 'decor-walkway.mp4'),
    poster: media('Videos', 'decor-walkway.jpg'),
    title: 'The Grand Entrance',
    note: 'Decor & lighting',
    duration: '0:53',
  },
  {
    src: media('Videos', 'aerial-night-view.mp4'),
    poster: media('Videos', 'aerial-night-view.jpg'),
    title: 'Swagattam From Above',
    note: 'An aerial view by night',
    duration: '1:08',
  },
  {
    src: media('Videos', 'venue-night-walkthrough.mp4'),
    poster: media('Videos', 'venue-night-walkthrough.jpg'),
    title: 'An Evening At Swagattam',
    note: 'Lawns, lights & more',
    duration: '0:51',
  },
  {
    src: media('Videos', 'mandap-decor.mp4'),
    poster: media('Videos', 'mandap-decor.jpg'),
    title: 'Mandap Décor',
    note: 'Details that matter',
    duration: '0:58',
  },
];

const galleryImages: GalleryImage[] = [
  ['20211210_102631.webp', 'Mandap ceremony detail', 'Wedding'],
  ['20250207_095313.webp', 'Wedding mandap arrangement', 'Wedding'],
  ['20221219_181806.webp', 'Sangeet lights and celebration', 'Sangeet'],
  ['20221219_182113.webp', 'Sangeet stage moment', 'Sangeet'],
  ['20201227_154619.webp', 'Engagement celebration', 'Engagement'],
  ['20221211_181811.webp', 'Engagement decor', 'Engagement'],
  ['hal2.jfif', 'Haldi ceremony colour', 'Haldi'],
  ['hal3.jfif', 'Haldi celebration', 'Haldi'],
  ['20210131_183223.webp', 'Reception stage', 'Reception'],
  ['NCP_1598.webp', 'Reception floral stage', 'Reception'],
  ['20220616_100729.webp', 'Baby shower details', 'Baby Shower'],
  ['20220927_163000.webp', 'Baby shower celebration', 'Baby Shower'],
  ['20210108_170316.webp', 'Chhori celebration detail', 'Other'],
  ['IMG-20191123-WA0009.webp', 'Celebration floral detail', 'Other'],
].map(([file, alt, category]) => {
  const folder =
    category === 'Engagement'
      ? 'engangement'
      : category === 'Wedding'
        ? 'Jumer mandap'
        : category === 'Sangeet'
          ? 'Sangeet'
          : category === 'Haldi'
            ? 'Haldi'
            : category === 'Reception'
              ? 'Reception Stage'
              : category === 'Baby Shower'
                ? 'Baby shower'
                : 'Chroi';
  return { src: media(folder, file), alt, category };
});

const instagramImages: GalleryImage[] = [
  galleryImages[0],
  { src: media('Instagram', '2.webp'), alt: 'Swagattam celebration detail 2', category: 'Instagram' },
  { src: media('Instagram', '3.webp'), alt: 'Swagattam celebration detail 3', category: 'Instagram' },
  { src: media('Instagram', '4.webp'), alt: 'Swagattam celebration detail 4', category: 'Instagram' },
  { src: media('Instagram', '5.webp'), alt: 'Swagattam celebration detail 5', category: 'Instagram' },
  { src: media('Instagram', '6.jpg'), alt: 'Swagattam celebration detail 6', category: 'Instagram' },
];

function categoryGallery(folder: string, category: string, files: string[]): GalleryImage[] {
  return files.map((file, index) => ({
    src: media(folder, file),
    alt: `${category} photograph ${index + 1}`,
    category,
  }));
}

const eventGalleries: Record<string, GalleryImage[]> = {
  Wedding: categoryGallery('Weeding', 'Wedding', [
    '20210108_170316.webp',
    '20211210_122406.webp',
    '20230128_174436.webp',
    '20231226_112705.webp',
    '8.12.2019.webp',
    'IMG-20180424-WA0015.webp',
    'IMG-20191123-WA0009.webp',
    'IMG-20251120-WA0014.webp',
    'Real Flower.webp',
    'WhatsApp Image 2024-02-28 at 12.17.41 PM.webp',
    'WhatsApp Image 2024-02-28 at 12.17.56 PM.webp',
    'WhatsApp Image 2024-02-28 at 12.17.58 PM.webp',
    'WhatsApp Image 2026-09-18 at 5.35.16 PM (1).webp',
    '10.webp',
  ]),
  Engagement: categoryGallery('engangement', 'Engagement', [
    '20201227_154619.webp',
    '20211210_152944.webp',
    '20230330_073450.webp',
    'IMG-20180623-WA0002.webp',
    'IMG-20220206-WA0004.webp',
    'WhatsApp Image 2026-09-18 at 5.35.16 PM.webp',
  ]),
  Haldi: categoryGallery('Haldi', 'Haldi', [
    'hal2.jfif',
    'hal3.jfif',
    'haldi 1.jfif',
    'WhatsApp Image 2026-09-19 at 3.32.58 PM (1).jpeg',
    'WhatsApp Image 2026-09-19 at 3.32.58 PM (2).jpeg',
    'WhatsApp Image 2026-09-19 at 3.32.58 PM.jpeg',
  ]),
  Sangeet: categoryGallery('Sangeet', 'Sangeet', [
    '20221219_181806.webp',
    '20221219_194710.webp',
    'MPR_2369 [50%].webp',
    'MPR_2387 [50%].webp',
    'NCP_1623.webp',
    'NCP_1626.webp',
    'sangeet.jpg',
    'sangeet1.jpg',
  ]),
  Reception: categoryGallery('Reception Stage', 'Reception', [
    '20210131_183223.webp',
    '20250204_202401.webp',
    'IMG-20180519-WA0026.webp',
    'IMG-20180519-WA0027.webp',
    'IMG-20180519-WA0030.webp',
    'IMG-20180519-WA0031.webp',
    'IMG-20190219-WA0035.webp',
    'MPR_2342 [50%].webp',
    'MPR_2360 [50%].webp',
    'MPR_2361 [50%].webp',
    'MPR_2369 [50%].webp',
    'MPR_2387 [50%].webp',
    'NCP_1598.webp',
    'NCP_1616.webp',
    'NCP_1620.webp',
    'NCP_1623.webp',
    'NCP_1626.webp',
    'NCP_1631.webp',
    'NCP_1638.webp',
    'SJB_9031 [50%].webp',
    'SJB_9037 [50%].webp',
    'SJB_9048 [50%].webp',
    'WhatsApp Image 2025-11-12 at 4.44.20 PM.webp',
  ]),
  'Baby Shower': categoryGallery('Baby shower', 'Baby Shower', [
    '20220616_100729.webp',
    '20220927_163000.webp',
    '20220927_163612.webp',
  ]),
  Other: categoryGallery('other', 'Other celebrations', [
    '20201207_105051.webp',
    '20211210_102631.webp',
    '20250207_095313.webp',
    'atul dada.jpg',
    'atul dada1.jpg',
    'MPR_2360 [50%].webp',
    'NCP_1638.webp',
    'Real Flower.webp',
  ]),
};

const eventCards = [
  {
    title: 'Weddings',
    note: 'Mandap moments',
    image: media('Events', 'wedding-section-replace.webp'),
    category: 'Wedding',
  },
  {
    title: 'Engagements',
    note: 'The beginning of forever',
    image: media('Events', 'engagement-replace.webp'),
    category: 'Engagement',
  },
  {
    title: 'Haldi',
    note: 'Colour, laughter, ritual',
    image: media('Events', 'haldi-replace.jfif'),
    category: 'Haldi',
  },
  {
    title: 'Sangeet',
    note: 'Music after sunset',
    image: galleryImages[2].src,
    category: 'Sangeet',
  },
  {
    title: 'Receptions',
    note: 'A beautiful finale',
    image: galleryImages[8].src,
    category: 'Reception',
  },
  {
    title: 'Baby Showers',
    note: 'Intimate new beginnings',
    image: galleryImages[10].src,
    category: 'Baby Shower',
  },
  {
    title: 'Other celebrations',
    note: 'Your kind of together',
    image: galleryImages[12].src,
    category: 'Other',
  },
];

const navItems = [
  ['About', '#about'],
  ['Events', '#events'],
  ['Videos', '#videos'],
  ['Venue', '#venue'],
  ['Instagram', '#instagram'],
  ['Contact', '#contact'],
];
const eventTypes = [
  'Wedding',
  'Engagement',
  'Haldi',
  'Sangeet',
  'Reception',
  'Baby Shower',
  'Other',
];

function whatsappUrl(message?: string) {
  const fallback = `Hello, I am interested in ${siteConfig.businessName}. I would like to enquire about an event.`;
  return `${siteConfig.whatsappHref}?text=${encodeURIComponent(message || fallback)}`;
}

function scrollToId(id: string) {
  document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function CallLink({
  onDesktopCall,
  className,
  children,
  dataTestId,
  ariaLabel,
}: {
  onDesktopCall: () => void;
  className?: string;
  children: ReactNode;
  dataTestId?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      className={className}
      href={siteConfig.phoneHref}
      onClick={(event) => {
        if (window.matchMedia('(min-width: 801px)').matches) {
          event.preventDefault();
          onDesktopCall();
        }
      }}
      data-testid={dataTestId}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

function SectionIntro({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: string;
}) {
  return (
    <div className="section-heading reveal">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="font-display">{title}</h2>
      </div>
      {copy && <p>{copy}</p>}
    </div>
  );
}

function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 950);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Loading Swagattam Party Lawns">
      <div className="loading-inner">
        <div className="loading-logo-wrap">
          <img
            src={media('Logo', 'party_lawns_logo_round_high_res.webp')}
            alt=""
            className="loading-logo"
            width="72"
            height="72"
          />
        </div>
        <span className="loading-name">Swagattam Party Lawns</span>
        <span className="loading-line" />
        <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" />
      </div>
    </div>
  );
}

function Nav({ onEnquire, onCall }: { onEnquire: () => void; onCall: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <a className="brand" href="#home" aria-label="Swagattam Party Lawns home" data-testid="link-home">
          <span className="logo-frame">
            <img
              className="logo"
              src={media('Logo', 'party_lawns_logo_round_high_res.webp')}
              alt="Swagattam Party Lawns logo"
              width="50"
              height="50"
            />
          </span>
          <span className="brand-copy">
            <strong>SWAGATTAM</strong>
            <small>PARTY LAWNS</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} data-testid={`link-nav-${label.toLowerCase()}`}>
              {label}
            </a>
          ))}
        </nav>
        <div className="nav-actions">
          <CallLink className="text-link" onDesktopCall={onCall} dataTestId="link-nav-call">
            Call now
          </CallLink>
          <button className="btn btn-red" onClick={onEnquire} data-testid="button-nav-enquire">
            Enquire now <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          data-testid="button-mobile-menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="mobile-menu">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} data-testid={`link-mobile-${label.toLowerCase()}`}>
              {label}
            </a>
          ))}
          <button
            className="btn btn-red"
            onClick={() => {
              setOpen(false);
              onEnquire();
            }}
            data-testid="button-mobile-enquire"
          >
            Enquire now <ArrowUpRight size={15} />
          </button>
        </div>
      )}
    </header>
  );
}

function Hero({ onEnquire }: { onEnquire: () => void }) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="hero" id="home">
      <video
        className={`hero-video ${videoFailed ? 'is-hidden' : ''}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={propertyImages[0].src}
        aria-label="Atmospheric view of Swagattam Party Lawns"
        onError={() => setVideoFailed(true)}
      >
          <source src={`${import.meta.env.BASE_URL}media/hero/swagattam-hero.mp4`} type="video/mp4" />
      </video>
      <div className={`hero-fallback ${videoFailed ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className="hero-content reveal is-visible">
        <div className="hero-kicker">
          <span className="gold-rule" /> A celebration destination
        </div>
        <h1 className="font-display">
          <span className="sr-only">Swagattam Party Lawns — </span>
          Where beautiful <em>celebrations</em> begin.
        </h1>
        <p className="hero-intro">
          A beautiful setting for weddings, receptions, engagements and the gatherings you will remember long after the last song.
        </p>
        <div className="hero-actions">
          <button className="btn btn-red" onClick={onEnquire} data-testid="button-hero-enquire">
            Plan your event <ArrowUpRight size={15} />
          </button>
          <a className="btn btn-light" href={whatsappUrl()} target="_blank" rel="noopener noreferrer" data-testid="link-hero-whatsapp">
            <MessageCircle size={15} /> WhatsApp us
          </a>
        </div>
        <div className="scroll-note">
          <i /> Scroll to explore
        </div>
      </div>
      <div className="hero-seal" aria-hidden="true">
        Moments
        <br />
        made
        <br />
        beautiful
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="intro-section" id="about">
      <div className="section-wrap">
        <div className="intro-grid">
          <div className="intro-title reveal">
            <h2 className="font-display">A Natural Escape for Every Celebration</h2>
          </div>
          <div className="intro-copy reveal">
            <p>
              Swagattam Party Lawns is surrounded by a beautiful blend of nature, water, and open spaces, creating a calm and refreshing atmosphere for every celebration. At the heart of the venue is a charming fountain lake with a picturesque bridge, complemented by a spacious banquet, lush gardens, and an abundance of trees.
            </p>
            <p>The natural surroundings, open lawns, and peaceful setting create an experience that feels elegant yet connected to nature — a place where celebrations, photographs, and unforgettable moments come together.</p>
          </div>
        </div>
        <div className="venue-overview">
          <div className="venue-image reveal">
            <img
              src={propertyImages[0].src}
              alt="Swagattam Party Lawns venue"
              loading="lazy"
              decoding="async"
              width="1200"
              height="800"
            />
            <span className="venue-image-caption">A grand space for every celebration</span>
          </div>
          <div className="venue-information reveal">
            <span className="eyebrow">About Swagattam</span>
            <h3 className="font-display">A Grand Space for Every Celebration</h3>
            <p className="venue-copy">
              Swagattam Party Lawns offers a spacious 70,000 sq. ft. lawn area along with a 5,500 sq. ft. banquet hall, four connected rooms, and the flexibility to host gatherings from 100 to 1,500 guests.
            </p>
            <div className="venue-stats" aria-label="Swagattam Party Lawns venue information">
              <div className="venue-stat">
                <strong>70,000+</strong>
                <span>Sq. ft. lawn area</span>
              </div>
              <div className="venue-stat">
                <strong>5,500</strong>
                <span>Sq. ft. banquet hall</span>
              </div>
              <div className="venue-stat">
                <strong>4</strong>
                <span>Connected rooms</span>
              </div>
              <div className="venue-stat">
                <strong>100–1,500</strong>
                <span>Guest capacity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyChoose() {
  const items = [
    ['01', 'Make an entrance', 'A venue with the visual character to make every arrival, aisle and photograph feel considered.'],
    ['02', 'Room for ritual', 'Bring together the colour, music and meaningful traditions that make an Indian celebration yours.'],
    ['03', 'Beautifully flexible', 'Shape the setting around your celebration, from intimate gatherings to a full wedding weekend.'],
    ['04', 'Start with a conversation', 'Tell us what you are imagining. We will help you take the next step with clarity.'],
  ];

  return (
    <section className="why-section">
      <div className="section-wrap">
        <SectionIntro
          eyebrow="Why Swagattam"
          title={
            <>
              The details make
              <br />
              <em>the memory.</em>
            </>
          }
          copy="A premium celebration is felt in the atmosphere, not just counted in amenities. Come see what your day could look like."
        />
        <div className="why-grid">
          {items.map(([number, title, copy]) => (
            <article className="why-card reveal" key={number}>
              <span className="why-number">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryGallery({
  category,
  images,
  onClose,
}: {
  category: string | null;
  images: GalleryImage[];
  onClose: () => void;
}) {
  const isOpen = category !== null;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!category) return null;

  return (
    <div
      className="category-gallery"
      role="dialog"
      aria-modal="true"
      aria-label={`${category} photo gallery`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid={`gallery-${category.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="category-gallery-panel">
        <div className="category-gallery-header">
          <div>
            <span className="eyebrow">Swagattam celebrations</span>
            <h2 className="font-display">{category}</h2>
            <p>{images.length} photographs from this celebration</p>
          </div>
          <button className="category-gallery-close" type="button" onClick={onClose} aria-label="Close photo gallery" data-testid="button-gallery-close">
            <X size={20} />
          </button>
        </div>
        <div className="category-gallery-grid">
          {images.map((image) => (
            <figure className="category-gallery-item" key={image.src}>
              <img src={image.src} alt={image.alt} loading="lazy" decoding="async" width="1200" height="900" />
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}

function Events({ onCategory }: { onCategory: (category: string) => void }) {
  return (
    <section className="events-section" id="events">
      <div className="section-wrap">
        <SectionIntro
          eyebrow="Events we host"
          title={
            <>
              For every kind of
              <br />
              <em>together.</em>
            </>
          }
          copy="A palette of spaces and moments for the rituals, parties and milestones that bring people close."
        />
        <div className="events-list">
          {eventCards.map((event) => (
            <button
              type="button"
              className="event-card reveal"
              key={event.title}
              onClick={() => onCategory(event.category)}
              aria-label={`Open ${event.title} photo gallery`}
              data-testid={`button-event-${event.category.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img src={event.image} alt={`${event.title} at Swagattam Party Lawns`} loading="lazy" decoding="async" width="1200" height="900" />
              <span className="event-info">
                <small>{event.note}</small>
                <h3>{event.title}</h3>
                <span>
                  View {eventGalleries[event.category]?.length ?? 0} photographs <ArrowRight size={13} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Videos({ onPlay }: { onPlay: (video: VideoItem) => void }) {
  return (
    <section className="videos-section" id="videos">
      <div className="section-wrap">
        <SectionIntro
          eyebrow="Moments in motion"
          title={
            <>
              Watch the
              <br />
              <em>celebrations come alive.</em>
            </>
          }
          copy="A few reels from real Swagattam celebrations. Tap any video to play it with sound."
        />
        <div className="video-grid">
          {videoItems.map((video) => (
            <button
              type="button"
              className="video-card reveal"
              key={video.src}
              onClick={() => onPlay(video)}
              aria-label={`Play video: ${video.title}`}
              data-testid={`button-video-${video.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img src={video.poster} alt={video.title} loading="lazy" decoding="async" width="960" height="720" />
              <span className="video-play-icon" aria-hidden="true">
                <Play size={22} fill="currentColor" />
              </span>
              <span className="video-duration">{video.duration}</span>
              <span className="video-info">
                <small>{video.note}</small>
                <h3>{video.title}</h3>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoLightbox({ video, onClose }: { video: VideoItem | null; onClose: () => void }) {
  const isOpen = video !== null;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Explicitly (re)request playback with sound once the element mounts.
    // Autoplay is triggered by the user's click on the card, so browsers
    // allow unmuted playback here; if a browser still blocks it, the
    // native controls let the person press play themselves.
    const el = videoRef.current;
    if (el) {
      el.muted = false;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          /* autoplay blocked — controls remain available for manual play */
        });
      }
    }
  }, [isOpen, video?.src]);

  if (!video) return null;

  return (
    <div
      className="video-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      data-testid="video-lightbox"
    >
      <div className="video-lightbox-panel">
        <button className="video-lightbox-close" type="button" onClick={onClose} aria-label="Close video" data-testid="button-video-close">
          <X size={20} />
        </button>
        <video
          key={video.src}
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          controls
          autoPlay
          playsInline
          preload="none"
          className="video-lightbox-player"
        />
        <p className="video-lightbox-title">{video.title}</p>
      </div>
    </div>
  );
}

function Property() {
  return (
    <section className="property-section" id="venue">
      <div className="section-wrap">
        <SectionIntro
          eyebrow="What makes Swagattam special"
          title={
            <>
              More than a venue.
              <br />
              <em>A setting made for memorable celebrations.</em>
            </>
          }
          copy="From our spacious party lawns to the beautiful fountain lake within the property, Swagattam offers a setting that feels different from an ordinary event venue. Open surroundings, greenery, the calming presence of water, and thoughtfully designed spaces come together to create a beautiful atmosphere for weddings, celebrations and special occasions. A place where every celebration has its own backdrop."
        />
         <div className="property-grid">
           {propertyImages.map((image, index) => (
             <div
               className={`property-photo ${index === 0 ? 'feature' : ''} reveal`}
              key={image.src}
            >
              <img src={image.src} alt={image.alt} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" width="1200" height="800" />
              {index === 0 && <span className="photo-caption">The place where it happens</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InstagramSection() {
  return (
    <section className="instagram-section" id="instagram">
      <div className="section-wrap">
        <div className="instagram-head reveal">
          <div>
            <span className="eyebrow">Follow the celebrations</span>
            <h2 className="font-display instagram-title">
              Swagattam
              <br />
              <em>on Instagram.</em>
            </h2>
          </div>
          <a className="instagram-handle" href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" data-testid="link-instagram-profile">
            <Instagram size={18} /> {siteConfig.instagramHandle} <ArrowUpRight size={14} />
          </a>
        </div>
        <div className="insta-grid">
          {instagramImages.map((image) => (
            <div
              className="insta-item reveal"
              key={image.src}
            >
              <img src={image.src} alt={image.alt} loading="lazy" decoding="async" width="800" height="800" />
            </div>
          ))}
        </div>
        <div className="instagram-follow">
            <a className="btn btn-outline" href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" data-testid="link-instagram-follow">
            Follow us on Instagram <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Facilities() {
  const facilities = ['Celebration lawn', 'Mandap setting', 'Reception stage', 'Lighting and decor', 'Event support', 'Custom arrangements'];

  return (
    <section className="facilities-section">
      <div className="section-wrap facilities-layout">
        <div className="reveal">
          <span className="eyebrow">The essentials</span>
          <h2 className="font-display facilities-title">
            Made for the
            <br />
            <em>way you celebrate.</em>
          </h2>
          <p className="placeholder-note">Tell us what you are planning and the Swagattam team will help shape the details around it.</p>
        </div>
        <div className="facilities-list reveal">
          {facilities.map((item) => (
            <div className="facility" key={item}>
              <CircleCheck size={16} /> {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="quote-section">
      <div className="section-wrap reveal">
        <div className="quote-mark">“</div>
        <blockquote className="font-display">Your people. Your rituals. Your kind of beautiful.</blockquote>
        <cite>The Swagattam experience</cite>
      </div>
    </section>
  );
}

function ContactSection({ onCall }: { onCall: () => void }) {
  return (
    <section className="contact-section" id="contact">
      <div className="section-wrap">
        <SectionIntro
          eyebrow="Find Swagattam"
          title={
            <>
              Come see where
              <br />
              <em>your story begins.</em>
            </>
          }
          copy="Visit the venue, take in the light and imagine the people you love gathered here."
        />
        <div className="contact-layout">
          <div className="map-card reveal">
            <iframe
              title="Map showing Swagattam Party Lawns"
              src={siteConfig.googleMapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="map-qr" aria-label="Scan the QR code for Swagattam Party Lawns directions">
              <img src={siteConfig.locationQrSrc} alt="QR code for Swagattam Party Lawns location" width="58" height="58" />
              <span>Scan for directions</span>
            </div>
            <a className="map-link" href={siteConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer" data-testid="link-contact-directions">
              Open in Google Maps <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="contact-details reveal">
            <div className="contact-detail">
              <MapPin size={17} />
              <div>
                <strong>Find us</strong>
                <span>{siteConfig.address}</span>
              </div>
            </div>
            <div className="contact-detail">
              <Phone size={17} />
              <div>
                <strong>Call</strong>
                <CallLink onDesktopCall={onCall} dataTestId="link-contact-call">{siteConfig.phone}</CallLink>
              </div>
            </div>
             <div className="contact-detail">
              <MessageCircle size={17} />
              <div>
                <strong>WhatsApp</strong>
                 <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" data-testid="link-contact-whatsapp">{siteConfig.whatsapp}</a>
              </div>
            </div>
            <div className="contact-detail">
              <Mail size={17} />
              <div>
                <strong>Email</strong>
                 <a href={`mailto:${siteConfig.email}`} data-testid="link-contact-email">{siteConfig.email}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onEnquire, onCall }: { onEnquire: () => void; onCall: () => void }) {
  return (
    <footer className="footer">
      <div className="section-wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="eyebrow">A place for beautiful beginnings</span>
            <h2 className="font-display">Swagattam<br />Party Lawns</h2>
            <p>Premium celebrations, photographed in the places where they happen.</p>
            <button className="btn btn-red footer-enquire" onClick={onEnquire} data-testid="button-footer-enquire">
              Start a conversation <ArrowUpRight size={15} />
            </button>
          </div>
          <div>
            <h3>Explore</h3>
            <div className="footer-links">
              {navItems.map(([label, href]) => (
                <a key={href} href={href} data-testid={`link-footer-${label.toLowerCase()}`}>
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3>Speak to us</h3>
            <div className="footer-links">
              <CallLink onDesktopCall={onCall} dataTestId="link-footer-call">Call now</CallLink>
              <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" data-testid="link-footer-whatsapp">WhatsApp</a>
              <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer" data-testid="link-footer-instagram">Instagram</a>
              <a href={siteConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer" data-testid="link-footer-maps">Google Maps</a>
            </div>
          </div>
          <div>
            <h3>Online tools</h3>
            <div className="footer-links">
              <a href={siteConfig.estimatorUrl} data-testid="link-footer-estimator">Event estimator</a>
              <a href={siteConfig.adminUrl} data-testid="link-footer-admin">Admin portal</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Swagattam Party Lawns</span>
          <span>Weddings · celebrations · Vadodara</span>
        </div>
      </div>
    </footer>
  );
}

function EnquiryDialog({
  open,
  onClose,
  onSubmit,
  onCall,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (enquiry: Enquiry) => void;
  onCall: () => void;
}) {
  const [form, setForm] = useState<Enquiry>({
    name: '',
    mobile: '',
    email: '',
    eventType: 'Wedding',
    date: '',
    guests: '',
    area: '',
    message: '',
  });
  const [customEventType, setCustomEventType] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handler);
    };
  }, [onClose, open]);

  if (!open) return null;
  const update = (key: keyof Enquiry, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="enquiry-backdrop" role="dialog" aria-modal="true" aria-labelledby="enquiry-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()} data-testid="dialog-enquiry">
      <div className="enquiry-modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Your next chapter</span>
            <h2 id="enquiry-title" className="font-display">Let&apos;s plan your <em>celebration.</em></h2>
            <p>Share a few details and we&apos;ll continue the conversation on WhatsApp.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close enquiry form" data-testid="button-close-enquiry">
            <X size={20} />
          </button>
        </div>
        <form
          className="enquiry-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit({
              ...form,
              eventType: form.eventType === 'Other' ? customEventType || 'Other' : form.eventType,
            });
          }}
          data-testid="form-enquiry"
        >
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" value={form.name} onChange={(event) => update('name', event.target.value)} required placeholder="Enter your name" data-testid="input-name" />
          </div>
          <div className="field">
            <label htmlFor="mobile">Mobile number</label>
            <input id="mobile" type="tel" value={form.mobile} onChange={(event) => update('mobile', event.target.value)} required placeholder="Your number" data-testid="input-mobile" />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="Optional" data-testid="input-email" />
          </div>
          <div className="field">
            <label htmlFor="eventType">Event type</label>
            <select id="eventType" value={form.eventType} onChange={(event) => update('eventType', event.target.value)} data-testid="select-event-type">
              {eventTypes.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </div>
          {form.eventType === 'Other' && (
            <div className="field field-wide">
              <label htmlFor="customEventType">Your event category</label>
              <input id="customEventType" value={customEventType} onChange={(event) => setCustomEventType(event.target.value)} required placeholder="e.g. Birthday, corporate evening" data-testid="input-custom-event-type" />
            </div>
          )}
          <div className="field">
            <label htmlFor="date">Event date</label>
            <div className="date-input-wrap">
              <input
                id="date"
                className={`date-input ${form.date ? 'has-value' : ''}`}
                type="date"
                value={form.date}
                onChange={(event) => update('date', event.target.value)}
                placeholder="DD/MM/YYYY"
                data-testid="input-event-date"
              />
              {!form.date && <span className="date-input-placeholder" aria-hidden="true">DD/MM/YYYY</span>}
            </div>
          </div>
          <div className="field">
            <label htmlFor="guests">Number of guests</label>
            <input id="guests" value={form.guests} onChange={(event) => update('guests', event.target.value)} placeholder="Approximate" data-testid="input-guests" />
          </div>
          <div className="field field-wide">
            <label htmlFor="area">Preferred venue / area</label>
            <input id="area" value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="Tell us what you have in mind" data-testid="input-area" />
          </div>
          <div className="field field-wide">
            <label htmlFor="message">A note for us</label>
            <textarea id="message" value={form.message} onChange={(event) => update('message', event.target.value)} placeholder="Anything you would like the team to know?" data-testid="textarea-message" />
          </div>
          <div className="form-actions">
            <button className="btn btn-red" type="submit" data-testid="button-submit-enquiry">
              Send enquiry <ArrowUpRight size={15} />
            </button>
            <CallLink className="btn btn-outline" onDesktopCall={onCall} dataTestId="link-dialog-call">
              <Phone size={15} /> Call now
            </CallLink>
            <span className="form-status">Your details open as a pre-filled WhatsApp message.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function CallInfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="call-info-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-info-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      data-testid="dialog-call-info"
    >
      <div className="call-info-card">
        <button className="modal-close" onClick={onClose} aria-label="Close call information" data-testid="button-close-call-info">
          <X size={20} />
        </button>
        <span className="eyebrow">Speak to Swagattam</span>
        <h2 id="call-info-title" className="font-display">Call us to start your <em>celebration.</em></h2>
        <p>Use this number to reach the Swagattam Party Lawns team.</p>
        <strong className="call-info-number">{siteConfig.phone}</strong>
        <button className="btn btn-outline call-info-dismiss" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function MobileActions({ onEnquire }: { onEnquire: () => void }) {
  return (
    <div className="mobile-actions">
      <a href={siteConfig.phoneHref} data-testid="link-mobile-call"><Phone size={14} /> Call</a>
      <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" data-testid="link-mobile-whatsapp"><MessageCircle size={14} /> WhatsApp</a>
      <button onClick={onEnquire} data-testid="button-mobile-bottom-enquire"><CalendarDays size={14} /> Enquire</button>
    </div>
  );
}

function ExternalPageRedirect() {
  const basePath = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const pathname = window.location.pathname;
  const routePath = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname;
  const normalizedRoutePath = routePath.replace(/\/+$/, '') || '/';
  const destination =
    normalizedRoutePath === '/estimator'
      ? siteConfig.estimatorUrl
      : normalizedRoutePath === '/admin'
        ? siteConfig.adminUrl
        : null;

  useEffect(() => {
    if (!destination || !/^https?:\/\//i.test(destination)) return;
    window.location.replace(destination);
  }, [destination]);

  if (!destination) return null;

  return (
    <main className="external-page-placeholder">
      <div>
        <span className="eyebrow">Swagattam Party Lawns</span>
        <h1 className="font-display">This page is connected externally.</h1>
        <p>Set the matching VITE_ESTIMATOR_URL or VITE_ADMIN_URL value before building the GitHub Pages export.</p>
        <a className="btn btn-primary" href={`${basePath || ''}/`}>Return to website</a>
      </div>
    </main>
  );
}

function Home() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [callInfoOpen, setCallInfoOpen] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const handleSubmit = (enquiry: Enquiry) => {
    const message = `Hello, I am interested in ${siteConfig.businessName}.\n\nName: ${enquiry.name}\nMobile: ${enquiry.mobile}\nEmail: ${enquiry.email || 'Not provided'}\nEvent type: ${enquiry.eventType}\nEvent date: ${enquiry.date ? formatEventDate(enquiry.date) : 'Not decided'}\nGuests: ${enquiry.guests || 'Not decided'}\nPreferred venue/area: ${enquiry.area || 'Not specified'}\nMessage: ${enquiry.message || 'No additional message'}`;
    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
    setEnquiryOpen(false);
  };

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.reveal:not(.is-visible)'));
    if (!('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.08 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="site-shell">
      <Nav onEnquire={() => setEnquiryOpen(true)} onCall={() => setCallInfoOpen(true)} />
      <main>
        <Hero onEnquire={() => setEnquiryOpen(true)} />
        <About />
        <WhyChoose />
        <Events onCategory={setGalleryCategory} />
        <Videos onPlay={setActiveVideo} />
        <Property />
        <InstagramSection />
        <Facilities />
        <Testimonial />
        <ContactSection onCall={() => setCallInfoOpen(true)} />
      </main>
      <Footer onEnquire={() => setEnquiryOpen(true)} onCall={() => setCallInfoOpen(true)} />
      <div className="floating-actions">
        <CallLink className="float-btn call" onDesktopCall={() => setCallInfoOpen(true)} dataTestId="link-floating-call" ariaLabel="Call Swagattam Party Lawns">
          <Phone size={20} />
        </CallLink>
        <a className="float-btn whatsapp" href={whatsappUrl()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Swagattam Party Lawns" data-testid="link-floating-whatsapp"><MessageCircle size={20} /></a>
        <button className="float-btn enquire" onClick={() => setEnquiryOpen(true)} aria-label="Enquire with Swagattam Party Lawns" data-testid="button-floating-enquire"><CalendarDays size={20} /></button>
      </div>
      <MobileActions onEnquire={() => setEnquiryOpen(true)} />
      <EnquiryDialog open={enquiryOpen} onClose={() => setEnquiryOpen(false)} onSubmit={handleSubmit} onCall={() => setCallInfoOpen(true)} />
      <CallInfoDialog open={callInfoOpen} onClose={() => setCallInfoOpen(false)} />
      <CategoryGallery
        category={galleryCategory}
        images={galleryCategory ? eventGalleries[galleryCategory] ?? [] : []}
        onClose={() => setGalleryCategory(null)}
      />
      <VideoLightbox video={activeVideo} onClose={() => setActiveVideo(null)} />
    </div>
  );
}

function App() {
  useEffect(() => {
    const title = 'Swagattam Party Lawns Vadodara | Wedding Venue';
    const description = 'Swagattam Party Lawns is a premium wedding and event venue in Vadodara with a 70,000 sq. ft. lawn, banquet hall and space for 100–1,500 guests.';
    document.title = title;
    const updateMeta = (selector: string, attribute: string, content: string) => {
      let tag = document.head.querySelector<HTMLMetaElement>(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, selector.includes('property=') ? selector.split('"')[1] : selector.split('"')[1]);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    updateMeta('meta[name="description"]', 'name', description);
    updateMeta('meta[property="og:title"]', 'property', title);
    updateMeta('meta[property="og:description"]', 'property', description);
    updateMeta('meta[property="og:url"]', 'property', `${siteConfig.websiteUrl}/`);
    updateMeta('meta[name="twitter:title"]', 'name', title);
    updateMeta('meta[name="twitter:description"]', 'name', description);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey={window.location.pathname}>
          <ExternalPageRedirect />
          {!['/estimator', '/admin'].some((path) => normalizedPathname(window.location.pathname).endsWith(path)) && <Home />}
          <LoadingScreen />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;