#!/usr/bin/env node
/*
 * Generates per-language static HTML pages from src/index.template.html.
 * - Reads translations from i18n.js (Node export).
 * - Emits: index.html (en, x-default) + {lang}/index.html for each other lang.
 * - Emits: sitemap.xml with hreflang alternates.
 * - Injects: localized title/description, canonical, hreflang, og:locale,
 *   HowTo + FAQ + WebApplication + Person JSON-LD, translated static text.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'src', 'index.template.html');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const SITE_URL = 'https://dblqr.org';

const { I18N, SUPPORTED_LANGS } = require(path.join(ROOT, 'i18n.js'));

// Canonical primary lang = en (served at site root).
const DEFAULT_LANG = 'en';

const OG_LOCALE = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ru: 'ru_RU',
  ja: 'ja_JP',
};

function urlForLang(lang) {
  return lang === DEFAULT_LANG ? `${SITE_URL}/` : `${SITE_URL}/${lang}/`;
}

function outputPathForLang(lang) {
  return lang === DEFAULT_LANG
    ? path.join(ROOT, 'index.html')
    : path.join(ROOT, lang, 'index.html');
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function buildHreflangBlock(currentLang) {
  const lines = SUPPORTED_LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${urlForLang(l)}">`,
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${urlForLang(DEFAULT_LANG)}">`);
  return lines.join('\n');
}

function buildOgLocaleAlternates(currentLang) {
  return SUPPORTED_LANGS
    .filter((l) => l !== currentLang)
    .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)
    .join('\n');
}

function buildJsonLd(lang) {
  const dict = I18N[lang];
  const url = urlForLang(lang);
  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Dragon Ball Legends QR Generator',
    alternateName: 'DBL QR Generator Anniversary 2026',
    url,
    description: dict.metaDescription,
    inLanguage: lang,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: {
      '@type': 'Person',
      name: 'Artur Sopelnik',
      url: 'https://artursopelnik.de/',
    },
  };
  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: dict.metaTitle,
    inLanguage: lang,
    step: [
      { '@type': 'HowToStep', position: 1, name: dict.howto1Title, text: dict.howto1Text },
      { '@type': 'HowToStep', position: 2, name: dict.howto2Title, text: dict.howto2Text },
      { '@type': 'HowToStep', position: 3, name: dict.howto3Title, text: dict.howto3Text },
    ],
  };
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: lang,
    mainEntity: [1, 2, 3, 4].map((n) => ({
      '@type': 'Question',
      name: dict['faq' + n + 'Q'],
      acceptedAnswer: { '@type': 'Answer', text: dict['faq' + n + 'A'] },
    })),
  };
  const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
  return [webApp, howTo, faq]
    .map((o) => `<script type="application/ld+json">${jsonSafe(o)}</script>`)
    .join('\n');
}

function renderPage(template, lang) {
  const dict = I18N[lang];
  let html = template;

  // Meta / OG tokens.
  html = html.replaceAll('{{LANG}}', lang);
  html = html.replaceAll('{{TITLE}}', escapeHtmlAttr(dict.metaTitle));
  html = html.replaceAll('{{DESCRIPTION}}', escapeHtmlAttr(dict.metaDescription));
  html = html.replaceAll('{{CANONICAL}}', urlForLang(lang));
  html = html.replaceAll('{{HREFLANG}}', buildHreflangBlock(lang));
  html = html.replaceAll('{{OG_LOCALE}}', OG_LOCALE[lang]);
  html = html.replaceAll('{{OG_LOCALE_ALTERNATES}}', buildOgLocaleAlternates(lang));
  html = html.replaceAll('{{JSON_LD}}', buildJsonLd(lang));

  // Translated text nodes: {{TEXT_key}} → dict[key], HTML-escaped.
  html = html.replace(/\{\{TEXT_([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const val = dict[key];
    if (val === undefined) throw new Error(`Missing i18n key "${key}" for lang "${lang}"`);
    return escapeHtmlText(val);
  });

  // Translated attribute values: {{ATTR_key}} → dict[key], attr-escaped.
  html = html.replace(/\{\{ATTR_([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    const val = dict[key];
    if (val === undefined) throw new Error(`Missing i18n attr key "${key}" for lang "${lang}"`);
    return escapeHtmlAttr(val);
  });

  // Guard: no unresolved tokens.
  const leftover = html.match(/\{\{[A-Z_][A-Z0-9_]*\}\}|\{\{(TEXT|ATTR)_[a-zA-Z0-9_]+\}\}/);
  if (leftover) throw new Error(`Unresolved token: ${leftover[0]}`);

  return html;
}

function writeSitemap() {
  const urls = SUPPORTED_LANGS.map((lang) => {
    const loc = urlForLang(lang);
    const alternates = SUPPORTED_LANGS.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlForLang(l)}"/>`,
    );
    alternates.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlForLang(DEFAULT_LANG)}"/>`,
    );
    const priority = lang === DEFAULT_LANG ? '1.0' : '0.9';
    return `  <url>
    <loc>${loc}</loc>
${alternates.join('\n')}
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, SITEMAP_PATH)}`);
}

function main() {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  for (const lang of SUPPORTED_LANGS) {
    const html = renderPage(template, lang);
    const out = outputPathForLang(lang);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, out)}`);
  }
  writeSitemap();
}

main();
