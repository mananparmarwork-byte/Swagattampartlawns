// Mobile number helpers: Indian numbers (10 digits, no country code needed) and numbers from any other country.
// International numbers are typed with a leading "+" (or "00") and the country code, e.g. +1 415 555 0132, +971 50 123 4567.

export const MOBILE_HINT = 'India: 10 digits. Other countries: start with + and the country code (e.g. +971 50 123 4567)';
export const MOBILE_PLACEHOLDER = 'e.g. 98765 43210 or +1 415 555 0132';

// Keep only characters that can appear in a phone number; "+" is allowed only as the first character.
export function cleanMobileInput(value: string): string {
  const trimmed = value.replace(/[^\d+\s()-]/g, '');
  const plus = trimmed.trimStart().startsWith('+') ? '+' : '';
  return (plus + trimmed.replace(/\+/g, '')).replace(/^\s+/, '').slice(0, 24);
}

// Returns the full international number as digits only (country code first, no "+"), or '' when the number is not valid.
export function internationalDigits(mobile: string): string {
  const raw = (mobile ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+') || raw.startsWith('00')) {
    const national = raw.startsWith('+') ? digits : digits.slice(2);
    // International numbers (E.164) are 8 to 15 digits including the country code, and never start with 0.
    return /^[1-9]\d{7,14}$/.test(national) ? national : '';
  }
  // No "+": treat as an Indian number, with or without 0 / 91 in front.
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : '';
}

export const isValidMobile = (mobile: string) => internationalDigits(mobile) !== '';

export function mobileError(mobile: string): string {
  const raw = (mobile ?? '').trim();
  if (raw.startsWith('+') || raw.startsWith('00')) return 'Enter the country code followed by the number, e.g. +971 50 123 4567.';
  return 'Enter a 10 digit Indian number, or start with + and the country code for other countries.';
}

export function whatsappUrl(mobile: string, text: string): string {
  return `https://wa.me/${internationalDigits(mobile)}?text=${encodeURIComponent(text)}`;
}
