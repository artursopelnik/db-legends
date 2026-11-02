#!/usr/bin/env node
/*
 * Generates an RSS 2.0 feed of the active promo codes for every supported
 * language from /promo-codes.json.
 * - Emits: {lang-prefix}/promo-codes/feed.xml ({lang-prefix} is empty for
 *   English, so the URL is /promo-codes/feed.xml).
 * - One <item> per active code; pubDate is the code's firstSeen timestamp
 *   (written by scripts/fetch_promo_codes.py), guid is stable per code so
 *   feed readers notify only once.
 * - Runs in the deploy workflow as well, so a promo-code update goes live in
 *   the feeds without a manual rebuild.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const { promoPathForLang, promoUrlForLang, SITE_URL, DEFAULT_LANG } = require('./promo-lib.js');
const { I18N, SUPPORTED_LANGS } = require(path.join(ROOT, 'i18n.js'));

const PROMO_JSON = path.join(ROOT, 'promo-codes.json');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function feedPathForLang(lang) {
  return `${promoPathForLang(lang)}feed.xml`;
}

function feedUrlForLang(lang) {
  return `${SITE_URL}${feedPathForLang(lang)}`;
}

function rfc822(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

function humanDate(isoDate, lang) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(d);
}

function loadPromo() {
  const data = JSON.parse(fs.readFileSync(PROMO_JSON, 'utf8'));
  const codes = Array.isArray(data.codes) ? data.codes : [];
  return { updatedAt: data.updatedAt, codes };
}

function renderFeed(lang, promo) {
  const dict = I18N[lang];
  const pageUrl = promoUrlForLang(lang);
  const items = [...promo.codes]
    .sort((a, b) => String(b.firstSeen || '').localeCompare(String(a.firstSeen || '')))
    .map((c) => {
      const description = dict.promoFeedItem
        .replace('{reward}', c.reward)
        .replace('{date}', c.expires ? humanDate(c.expires, lang) : '–');
      return `    <item>
      <title>${escapeXml(`${c.code} – ${c.reward}`)}</title>
      <link>${escapeXml(pageUrl)}</link>
      <guid isPermaLink="false">dblqr-promo-${escapeXml(c.code)}</guid>
      <pubDate>${rfc822(c.firstSeen || promo.updatedAt)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(dict.promoFeedTitle)}</title>
    <link>${escapeXml(pageUrl)}</link>
    <description>${escapeXml(dict.promoFeedDescription)}</description>
    <language>${lang}</language>
    <lastBuildDate>${rfc822(promo.updatedAt)}</lastBuildDate>
    <ttl>360</ttl>
    <atom:link href="${escapeXml(feedUrlForLang(lang))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function main() {
  const promo = loadPromo();
  for (const lang of SUPPORTED_LANGS) {
    const out = path.join(ROOT, feedPathForLang(lang).replace(/^\//, ''));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderFeed(lang, promo), 'utf8');
    console.log(`Wrote ${path.relative(ROOT, out)} (${promo.codes.length} codes)`);
  }
}

if (require.main === module) main();

module.exports = { feedPathForLang, feedUrlForLang, DEFAULT_LANG };
