#!/usr/bin/env node
/*
 * Generates the promo-codes page for every supported language from src/promo/.
 * - Emits: {lang-prefix}/promo-codes/index.html ({lang-prefix} is empty for
 *   English so the URL stays /promo-codes/).
 * - The codes themselves are fetched client-side from /promo-codes.json so the
 *   page stays fresh without a rebuild (the JSON is updated by
 *   scripts/fetch_promo_codes.py).
 * - Injects: hreflang across languages, canonical, WebPage + BreadcrumbList
 *   JSON-LD, shared blog CSS, localized nav / CTA / footer text from i18n.js.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'promo');

const { promoUrlForLang, SITE_URL, DEFAULT_LANG } = require('./promo-lib.js');
const { blogPathForLang, homePathForLang, postPath } = require('./blog-lib.js');
const { teamsPathForLang } = require('./teams-lib.js');
const { I18N, SUPPORTED_LANGS } = require(path.join(ROOT, 'i18n.js'));

const HOWTO_POST_SLUG = 'dragon-ball-legends-promo-codes-how-to-redeem';

const OG_LOCALE = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ru: 'ru_RU',
  ja: 'ja_JP',
};

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const jsonSafe = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

function buildHreflang() {
  const lines = SUPPORTED_LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${promoUrlForLang(l)}">`,
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${promoUrlForLang(DEFAULT_LANG)}">`);
  return lines.join('\n');
}

function buildOgLocaleAlternates(currentLang) {
  return SUPPORTED_LANGS
    .filter((l) => l !== currentLang)
    .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)
    .join('\n');
}

function promoJsonLd(lang) {
  const dict = I18N[lang];
  const url = promoUrlForLang(lang);
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: dict.promoH1,
    description: dict.promoMetaDescription,
    url,
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: 'dblqr.org', url: `${SITE_URL}/` },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DBL QR Generator', item: `${SITE_URL}${homePathForLang(lang)}` },
      { '@type': 'ListItem', position: 2, name: dict.navPromo, item: url },
    ],
  };
  return [webPage, breadcrumbs]
    .map((o) => `<script type="application/ld+json">${jsonSafe(o)}</script>`)
    .join('\n');
}

function renderPage(template, css, lang) {
  const dict = I18N[lang];
  const promoText = {
    copied: dict.toastPromoCopied,
    expires: dict.promoExpires,
  };
  return template
    .replaceAll('{{LANG}}', lang)
    .replaceAll('{{META_TITLE}}', escapeHtmlAttr(dict.promoMetaTitle))
    .replaceAll('{{META_DESCRIPTION}}', escapeHtmlAttr(dict.promoMetaDescription))
    .replaceAll('{{OG_TITLE}}', escapeHtmlAttr(dict.promoH1))
    .replaceAll('{{CANONICAL}}', promoUrlForLang(lang))
    .replaceAll('{{HREFLANG}}', buildHreflang())
    .replaceAll('{{OG_LOCALE}}', OG_LOCALE[lang])
    .replaceAll('{{OG_LOCALE_ALTERNATES}}', buildOgLocaleAlternates(lang))
    .replaceAll('{{JSON_LD}}', promoJsonLd(lang))
    .replaceAll('{{BLOG_CSS}}', css)
    .replaceAll('{{HOME_URL}}', homePathForLang(lang))
    .replaceAll('{{BLOG_URL}}', blogPathForLang(lang))
    .replaceAll('{{TEAMS_URL}}', teamsPathForLang(lang))
    .replaceAll('{{NAV_TEAMS_LABEL}}', escapeHtmlText(dict.navTeams))
    .replaceAll('{{NAV_BLOG_LABEL}}', escapeHtmlText(dict.blogNavBlog))
    .replaceAll('{{NAV_GENERATOR_LABEL}}', escapeHtmlText(dict.blogNavGenerator))
    .replaceAll('{{PROMO_H1}}', escapeHtmlText(dict.promoH1))
    .replaceAll('{{PROMO_INTRO}}', escapeHtmlText(dict.promoIntro))
    .replaceAll('{{PROMO_EMPTY}}', escapeHtmlText(dict.promoEmpty))
    .replaceAll('{{UPDATED_LABEL}}', escapeHtmlText(dict.blogPostUpdatedLabel))
    .replaceAll('{{SOURCE_LABEL}}', escapeHtmlText(dict.promoSource))
    .replaceAll('{{PROMO_HOWTO_URL}}', postPath(lang, HOWTO_POST_SLUG))
    .replaceAll('{{PROMO_HOWTO_LABEL}}', escapeHtmlText(dict.promoHowTo))
    .replaceAll('{{PROMO_TEXT_JSON}}', jsonSafe(promoText))
    .replaceAll('{{CTA_HTML}}', dict.blogIndexCtaHtml)
    .replaceAll('{{CTA_BTN}}', escapeHtmlText(dict.blogIndexCtaBtn))
    .replaceAll('{{FOOTER_DISCLAIMER}}', escapeHtmlText(dict.blogFooterDisclaimer))
    .replaceAll('{{LEGAL_NOTICE_LABEL}}', escapeHtmlText(dict.legalNotice))
    .replaceAll('{{PRIVACY_LABEL}}', escapeHtmlText(dict.privacy));
}

function checkNoLeftoverTokens(html, name) {
  const leftover = html.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
  if (leftover) throw new Error(`${name}: unresolved token ${leftover[0]}`);
}

function outDirForLang(lang) {
  return lang === DEFAULT_LANG
    ? path.join(ROOT, 'promo-codes')
    : path.join(ROOT, lang, 'promo-codes');
}

function main() {
  const css = fs.readFileSync(path.join(ROOT, 'src', 'blog', 'blog.css'), 'utf8').trim();
  const template = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
  for (const lang of SUPPORTED_LANGS) {
    const html = renderPage(template, css, lang);
    checkNoLeftoverTokens(html, `${lang}/promo-codes/index`);
    const outDir = outDirForLang(lang);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, path.join(outDir, 'index.html'))}`);
  }
}

main();
