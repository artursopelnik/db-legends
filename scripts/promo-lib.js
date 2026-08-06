/*
 * Shared helpers for the promo-codes page: per-language URLs.
 * Used by build-promo.js (rendering) and build-i18n.js (sitemap, links).
 * The codes themselves live in /promo-codes.json (updated by
 * scripts/fetch_promo_codes.py) and are rendered client-side so the page
 * stays fresh without a rebuild.
 */

'use strict';

const SITE_URL = 'https://dblqr.org';
const DEFAULT_LANG = 'en';

function promoPathForLang(lang) {
  return lang === DEFAULT_LANG ? '/promo-codes/' : `/${lang}/promo-codes/`;
}

function promoUrlForLang(lang) {
  return `${SITE_URL}${promoPathForLang(lang)}`;
}

module.exports = { promoPathForLang, promoUrlForLang, SITE_URL, DEFAULT_LANG };
