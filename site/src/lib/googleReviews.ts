// Google Maps reviews shown on the landing page – added by hand (no live connection to Google).
// To change what is shown: edit this list. Add, remove or reorder items; the slider updates by itself.
//   author  – reviewer's name as shown on Google
//   rating  – stars, 1 to 5
//   tag     – small grey line under the name (e.g. 'Local Guide'); leave '' for none
//   text    – the review text
// The overall rating / count in the badge are set below.

export type GoogleReview = { author: string; rating: number; tag: string; text: string };

export const GOOGLE_RATING = 4.4;
export const GOOGLE_REVIEW_COUNT = 527;

export const googleReviews: GoogleReview[] = [
  { author: 'ankeet patel', rating: 5, tag: 'Local Guide', text: 'Beautiful Wedding Plot with a Unique Twist. This is a fantastic, well-organized venue with a perfectly kept lawn. The standout feature is definitely the procession area surrounded by fountains, which makes for a very dramatic and elegant entrance. A top-tier choice for any major event!' },
  { author: 'Saajan Modi', rating: 5, tag: 'Local Guide', text: 'Awesome party plot great space and extraordinary marriage place with fountain around and marriage chori is in center. Awesome and extraordinary and great option for doly of dulhan. And they have also AC hall with bride and groom rooms.' },
  { author: 'Bipin Shah', rating: 5, tag: 'Local Guide', text: "Hosted Bride's wedding. Venue is very picturesque and well located on a less used road with sufficient parking options. Open lawns plus halls make it a perfect combo." },
  { author: 'priyank patel', rating: 5, tag: 'Local Guide', text: 'Spacious party plot with AC Banquet with garden lawn area also available. Best party plot for marriages , birthday party or any other function. Highly recommended.' },
  { author: 'Nehal Shah', rating: 5, tag: 'Local Guide', text: 'Very huge classy location for marriage. It has nice view and also garden. A big hall contains 4 rooms for changing and freshen up. Good decoration for marriage and good service.' },
  { author: 'Vishwas Rai', rating: 5, tag: 'Local Guide', text: 'Superb party plot well maintained and managed, Decoration is good and staff is very cooperative. Thanks for the wonderful experience Swagattam team✌️' },
  { author: 'Labdhi Shah', rating: 5, tag: 'Local Guide', text: 'Perfect location especially for Wedding & any other relevant events. It is little off road & near to famous landmark known RAMA KAKA NI DERI with lovely ambience & memorable place' },
  { author: 'Abhishek Singh', rating: 5, tag: 'Local Guide', text: 'The place is good & the staffs are polite & helpful.' },
  { author: 'Jigar Patel', rating: 5, tag: 'Local Guide', text: 'Very nice and good location, parking also good...open' },
  { author: 'Nishant Shah', rating: 5, tag: 'Local Guide', text: 'ambience is too good .. nice place for functions.' },
  { author: 'ASHISH GHANSHYAMBHAI PATEL', rating: 5, tag: 'Local Guide', text: 'Nice place for all functions.' },
  { author: 'Jansin Parmar', rating: 5, tag: '', text: 'This party plot is very beautiful ♥️♥️♥️' },
  { author: 'Alkesh Vaghela', rating: 4, tag: 'Local Guide', text: "A very nice hall, good decoration, with large enough space for event and food. Hall is with AC and fans and good enough lighting. There's no cold storage, so do keep a note of that while ordering any such items like cake." },
  { author: 'The mediocre singer', rating: 4, tag: 'Local Guide', text: "It's nice and big place to arrange some big events like a wedding.. They were really polite ... Other than that it was a good experience" },
  { author: 'Kishore Talegaonkar', rating: 4, tag: 'Local Guide', text: 'Very serene location but access road seems to be an issue. Could be disturbing to Residential colony nearby. Lawns are great' },
];
