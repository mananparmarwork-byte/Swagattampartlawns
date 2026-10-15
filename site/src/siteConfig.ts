export const siteConfig = {
  businessName: 'Swagattam Party Lawns',
  websiteUrl: 'https://www.swagattampartylawns.in',
  phone: '95747 73999',
  phoneHref: 'tel:+919574773999',
  whatsapp: '95747 73999',
  whatsappHref: 'https://wa.me/919574773999',
  email: 'swagattampartylawns@gmail.com',
  address: 'Swagatam Party Plot Rd, Chhani, Vadodara, Gujarat 391740',
  instagramHandle: '@swagattam_party_lawns',
  instagramUrl: 'https://instagram.com/swagattam_party_lawns?utm_source=qr',
  googleMapsUrl: 'https://maps.app.goo.gl/CYYjNmk8U1mSHg237',
  // Your Google Business listing — target of the "Read All Reviews on Google" button.
  googleReviewsUrl: 'https://maps.app.goo.gl/EpFZA2uc5qEnWgeA9',
  // Public URL of the reviews Worker, e.g. https://swagattam-reviews.<account>.workers.dev/api/reviews
  // Set VITE_REVIEWS_API_URL at build time (preferred) or paste the URL as the fallback below.
  reviewsApiUrl: (import.meta.env.VITE_REVIEWS_API_URL as string | undefined) || '',
  googleMapsEmbedUrl: 'https://www.google.com/maps?q=22.3517552,73.1670433&z=17&output=embed',
  locationQrSrc: `${import.meta.env.BASE_URL}media/qr/swagattam-location.svg`,
  estimatorUrl: import.meta.env.VITE_ESTIMATOR_URL || '/estimator',
  adminUrl: import.meta.env.VITE_ADMIN_URL || '/admin',
} as const;