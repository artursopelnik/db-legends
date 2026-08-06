#!/usr/bin/env node
/*
 * Generates the blog for every supported language from src/blog/.
 * - Reads posts from src/blog/posts/{lang}/*.html via blog-lib.js.
 * - Emits: {lang-prefix}/blog/index.html + {lang-prefix}/blog/{slug}/index.html.
 *   ({lang-prefix} is empty for English so URLs stay /blog/…)
 * - Injects: hreflang across languages, canonical, OG article tags,
 *   BlogPosting + BreadcrumbList JSON-LD, shared blog CSS, related-posts links,
 *   localized nav / CTA / footer text from i18n.js.
 * - Assumes the same set of slugs exists in every language so hreflang
 *   alternates and cross-post links line up.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'blog');

const {
  loadPosts,
  SITE_URL,
  DEFAULT_LANG,
  blogPathForLang,
  blogUrlForLang,
  homePathForLang,
  postUrl,
} = require('./blog-lib.js');
const { I18N, SUPPORTED_LANGS } = require(path.join(ROOT, 'i18n.js'));
const { teamsPathForLang } = require('./teams-lib.js');
const { promoPathForLang } = require('./promo-lib.js');

const OG_LOCALE = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ru: 'ru_RU',
  ja: 'ja_JP',
};

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
    'August', 'September', 'Oktober', 'November', 'Dezember'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  ja: null, // handled specially: YYYY年M月D日
};

function humanDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  if (lang === 'ja') return `${y}年${m}月${d}日`;
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  if (lang === 'en') return `${months[m - 1]} ${d}, ${y}`;
  // European style: "5 de julio de 2026", "5 juillet 2026", "5. Juli 2026", "5 июля 2026 г."
  if (lang === 'de') return `${d}. ${months[m - 1]} ${y}`;
  if (lang === 'es' || lang === 'pt') return `${d} de ${months[m - 1]} de ${y}`;
  if (lang === 'fr') return `${d} ${months[m - 1]} ${y}`;
  if (lang === 'ru') return `${d} ${months[m - 1]} ${y} г.`;
  return `${d} ${months[m - 1]} ${y}`;
}

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

function buildHreflang(currentSlug) {
  // currentSlug === null → blog index; otherwise a post slug (shared across langs).
  const lines = SUPPORTED_LANGS.map((l) => {
    const href = currentSlug === null ? blogUrlForLang(l) : postUrl(l, currentSlug);
    return `<link rel="alternate" hreflang="${l}" href="${href}">`;
  });
  const defaultHref = currentSlug === null
    ? blogUrlForLang(DEFAULT_LANG)
    : postUrl(DEFAULT_LANG, currentSlug);
  lines.push(`<link rel="alternate" hreflang="x-default" href="${defaultHref}">`);
  return lines.join('\n');
}

function buildOgLocaleAlternates(currentLang) {
  return SUPPORTED_LANGS
    .filter((l) => l !== currentLang)
    .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)
    .join('\n');
}

function postJsonLd(post) {
  const blogUrl = blogUrlForLang(post.lang);
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    mainEntityOfPage: post.url,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: post.lang,
    image: `${SITE_URL}/icons/icon-512.png`,
    author: { '@type': 'Person', name: 'Artur Sopelnik', url: 'https://artursopelnik.de/' },
    publisher: { '@type': 'Organization', name: 'dblqr.org', url: `${SITE_URL}/` },
    isPartOf: { '@type': 'Blog', name: 'Dragon Ball Legends Guides', url: blogUrl },
  };
  const dict = I18N[post.lang];
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DBL QR Generator', item: `${SITE_URL}${homePathForLang(post.lang)}` },
      { '@type': 'ListItem', position: 2, name: dict.blogNavBlog, item: blogUrl },
      { '@type': 'ListItem', position: 3, name: post.title, item: post.url },
    ],
  };
  return [blogPosting, breadcrumbs]
    .map((o) => `<script type="application/ld+json">${jsonSafe(o)}</script>`)
    .join('\n');
}

function indexJsonLd(lang, posts) {
  const dict = I18N[lang];
  const blog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: dict.blogIndexH1,
    url: blogUrlForLang(lang),
    description: dict.blogIndexMetaDescription,
    inLanguage: lang,
    publisher: { '@type': 'Organization', name: 'dblqr.org', url: `${SITE_URL}/` },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: p.url,
      datePublished: p.date,
      dateModified: p.updated,
    })),
  };
  return `<script type="application/ld+json">${jsonSafe(blog)}</script>`;
}

function renderPost(template, css, post, allPosts) {
  const dict = I18N[post.lang];
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => `      <li><a href="${p.path}">${escapeHtmlText(p.title)}</a></li>`)
    .join('\n');
  return template
    .replaceAll('{{LANG}}', post.lang)
    .replaceAll('{{TITLE}}', escapeHtmlAttr(post.title))
    .replaceAll('{{DESCRIPTION}}', escapeHtmlAttr(post.description))
    .replaceAll('{{CANONICAL}}', post.url)
    .replaceAll('{{HREFLANG}}', buildHreflang(post.slug))
    .replaceAll('{{OG_LOCALE}}', OG_LOCALE[post.lang])
    .replaceAll('{{OG_LOCALE_ALTERNATES}}', buildOgLocaleAlternates(post.lang))
    .replaceAll('{{DATE_ISO}}', post.date)
    .replaceAll('{{UPDATED_ISO}}', post.updated)
    .replaceAll('{{UPDATED_HUMAN}}', humanDate(post.updated, post.lang))
    .replaceAll('{{JSON_LD}}', postJsonLd(post))
    .replaceAll('{{BLOG_CSS}}', css)
    .replaceAll('{{HOME_URL}}', homePathForLang(post.lang))
    .replaceAll('{{BLOG_URL}}', blogPathForLang(post.lang))
    .replaceAll('{{NAV_BLOG_LABEL}}', escapeHtmlText(dict.blogNavBlog))
    .replaceAll('{{NAV_GENERATOR_LABEL}}', escapeHtmlText(dict.blogNavGenerator))
    .replaceAll('{{TEAMS_URL}}', teamsPathForLang(post.lang))
    .replaceAll('{{NAV_TEAMS_LABEL}}', escapeHtmlText(dict.navTeams))
    .replaceAll('{{PROMO_URL}}', promoPathForLang(post.lang))
    .replaceAll('{{NAV_PROMO_LABEL}}', escapeHtmlText(dict.navPromo))
    .replaceAll('{{UPDATED_LABEL}}', escapeHtmlText(dict.blogPostUpdatedLabel))
    .replaceAll('{{BLOG_LABEL}}', escapeHtmlText(dict.blogPostBlogLabel))
    .replaceAll('{{CTA_HTML}}', dict.blogPostCtaHtml)
    .replaceAll('{{CTA_BTN}}', escapeHtmlText(dict.blogPostCtaBtn))
    .replaceAll('{{RELATED_HEADING}}', escapeHtmlText(dict.blogPostRelatedHeading))
    .replaceAll('{{FOOTER_DISCLAIMER}}', escapeHtmlText(dict.blogFooterDisclaimer))
    .replaceAll('{{LEGAL_NOTICE_LABEL}}', escapeHtmlText(dict.legalNotice))
    .replaceAll('{{PRIVACY_LABEL}}', escapeHtmlText(dict.privacy))
    .replace('{{RELATED}}', related)
    .replace('{{CONTENT}}', post.body);
}

function renderIndex(template, css, lang, posts) {
  const dict = I18N[lang];
  const list = posts
    .map(
      (p) => `    <li class="post-card">
      <h2><a href="${p.path}">${escapeHtmlText(p.title)}</a></h2>
      <p class="post-meta">${humanDate(p.updated, lang)}</p>
      <p>${escapeHtmlText(p.description)}</p>
    </li>`,
    )
    .join('\n');
  const introHtml = dict.blogIndexIntroHtml.replaceAll('{HOME}', homePathForLang(lang));
  return template
    .replaceAll('{{LANG}}', lang)
    .replaceAll('{{META_TITLE}}', escapeHtmlAttr(dict.blogIndexMetaTitle))
    .replaceAll('{{META_DESCRIPTION}}', escapeHtmlAttr(dict.blogIndexMetaDescription))
    .replaceAll('{{OG_TITLE}}', escapeHtmlAttr(dict.blogIndexOgTitle))
    .replaceAll('{{TWITTER_DESCRIPTION}}', escapeHtmlAttr(dict.blogIndexTwitterDescription))
    .replaceAll('{{CANONICAL}}', blogUrlForLang(lang))
    .replaceAll('{{HREFLANG}}', buildHreflang(null))
    .replaceAll('{{OG_LOCALE}}', OG_LOCALE[lang])
    .replaceAll('{{OG_LOCALE_ALTERNATES}}', buildOgLocaleAlternates(lang))
    .replaceAll('{{JSON_LD}}', indexJsonLd(lang, posts))
    .replaceAll('{{BLOG_CSS}}', css)
    .replaceAll('{{HOME_URL}}', homePathForLang(lang))
    .replaceAll('{{NAV_GENERATOR_LABEL}}', escapeHtmlText(dict.blogNavGenerator))
    .replaceAll('{{TEAMS_URL}}', teamsPathForLang(lang))
    .replaceAll('{{NAV_TEAMS_LABEL}}', escapeHtmlText(dict.navTeams))
    .replaceAll('{{PROMO_URL}}', promoPathForLang(lang))
    .replaceAll('{{NAV_PROMO_LABEL}}', escapeHtmlText(dict.navPromo))
    .replaceAll('{{INDEX_H1}}', escapeHtmlText(dict.blogIndexH1))
    .replaceAll('{{INDEX_INTRO_HTML}}', introHtml)
    .replaceAll('{{CTA_HTML}}', dict.blogIndexCtaHtml)
    .replaceAll('{{CTA_BTN}}', escapeHtmlText(dict.blogIndexCtaBtn))
    .replaceAll('{{FOOTER_DISCLAIMER}}', escapeHtmlText(dict.blogFooterDisclaimer))
    .replaceAll('{{LEGAL_NOTICE_LABEL}}', escapeHtmlText(dict.legalNotice))
    .replaceAll('{{PRIVACY_LABEL}}', escapeHtmlText(dict.privacy))
    .replace('{{POST_LIST}}', list);
}

function checkNoLeftoverTokens(html, name) {
  const leftover = html.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
  if (leftover) throw new Error(`${name}: unresolved token ${leftover[0]}`);
}

function outDirForLang(lang) {
  return lang === DEFAULT_LANG
    ? path.join(ROOT, 'blog')
    : path.join(ROOT, lang, 'blog');
}

function buildLang(lang, postTemplate, indexTemplate, css) {
  const posts = loadPosts(lang);
  if (!posts.length) throw new Error(`No posts found for lang "${lang}"`);
  const outDir = outDirForLang(lang);
  fs.mkdirSync(outDir, { recursive: true });

  for (const post of posts) {
    const html = renderPost(postTemplate, css, post, posts);
    checkNoLeftoverTokens(html, `${lang}/${post.slug}`);
    const dir = path.join(outDir, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, path.join(dir, 'index.html'))}`);
  }

  const indexHtml = renderIndex(indexTemplate, css, lang, posts);
  checkNoLeftoverTokens(indexHtml, `${lang}/blog/index`);
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');
  console.log(`Wrote ${path.relative(ROOT, path.join(outDir, 'index.html'))}`);
}

function main() {
  const css = fs.readFileSync(path.join(SRC, 'blog.css'), 'utf8').trim();
  const postTemplate = fs.readFileSync(path.join(SRC, 'post.template.html'), 'utf8');
  const indexTemplate = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
  for (const lang of SUPPORTED_LANGS) {
    buildLang(lang, postTemplate, indexTemplate, css);
  }
}

main();
