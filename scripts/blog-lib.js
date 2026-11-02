/*
 * Shared helpers for the blog build: loads posts from src/blog/posts/{lang}/
 * and parses their front matter. Used by build-blog.js (rendering) and
 * build-i18n.js (sitemap).
 *
 * Post format: an HTML fragment starting with a front-matter comment:
 *
 *   <!--
 *   title: My post title
 *   description: Meta description for search engines.
 *   date: 2026-07-20
 *   updated: 2026-07-20
 *   -->
 *   <p>Post body as HTML…</p>
 *
 * The slug (and URL) is derived from the file name and must match across
 * languages so cross-post links resolve for every locale.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_ROOT = path.join(ROOT, 'src', 'blog', 'posts');
const SITE_URL = 'https://dblqr.org';
const DEFAULT_LANG = 'en';

function blogPathForLang(lang) {
  return lang === DEFAULT_LANG ? '/blog/' : `/${lang}/blog/`;
}

function blogUrlForLang(lang) {
  return `${SITE_URL}${blogPathForLang(lang)}`;
}

function homePathForLang(lang) {
  return lang === DEFAULT_LANG ? '/' : `/${lang}/`;
}

function postPath(lang, slug) {
  return `${blogPathForLang(lang)}${slug}/`;
}

function postUrl(lang, slug) {
  return `${SITE_URL}${postPath(lang, slug)}`;
}

function parseFrontMatter(raw, file) {
  const m = raw.match(/^<!--\s*\n([\s\S]*?)\n-->\s*\n?/);
  if (!m) throw new Error(`${file}: missing front-matter comment`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (!kv) throw new Error(`${file}: bad front-matter line: "${line}"`);
    meta[kv[1]] = kv[2].trim();
  }
  for (const key of ['title', 'description', 'date']) {
    if (!meta[key]) throw new Error(`${file}: front matter is missing "${key}"`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
    throw new Error(`${file}: date must be YYYY-MM-DD`);
  }
  meta.updated = meta.updated || meta.date;
  return { meta, body: raw.slice(m[0].length).trim() };
}

// Rewrites in-body blog links (`href="/blog/…"`) to the current language's
// blog path so cross-post links stay within the localized blog.
function localizeBodyLinks(body, lang) {
  if (lang === DEFAULT_LANG) return body;
  const target = blogPathForLang(lang);
  return body.replace(/href="\/blog\//g, `href="${target}`);
}

// Splits a localized page H1 around the "Dragon Ball Legends" brand so brand
// and page name render as two stacked lines (mirrors the generator's
// <h1>Dragon Ball Legends<br>QR Generator</h1>); on narrow phones the long
// one-line title used to wrap mid-word ("Team-" / "Guide"). Falls back to the
// plain escaped title when a translation doesn't contain the brand.
const H1_BRANDS = ['Dragon Ball Legends', 'ドラゴンボール レジェンズ'];

function escapeH1Text(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function splitH1Html(title) {
  for (const brand of H1_BRANDS) {
    const idx = title.indexOf(brand);
    if (idx === -1) continue;
    const rest = `${title.slice(0, idx)} ${title.slice(idx + brand.length)}`
      .replace(/\s+/g, ' ')
      .trim()
      // Drop a connector left dangling once the brand moves to its own line
      // ("Guía de equipos de …" → "Guía de equipos").
      .replace(/\s+(de|do|da|des|of)$/i, '');
    if (!rest) break;
    return `<span class="h1-brand">${escapeH1Text(brand)}</span> ` +
      `<span class="h1-page">${escapeH1Text(rest)}</span>`;
  }
  return escapeH1Text(title);
}

function loadPosts(lang) {
  const dir = path.join(POSTS_ROOT, lang);
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing blog posts directory for lang "${lang}": ${dir}`);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html'));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw, `${lang}/${file}`);
    const slug = file.replace(/\.html$/, '');
    return {
      slug,
      lang,
      url: postUrl(lang, slug),
      path: postPath(lang, slug),
      ...meta,
      body: localizeBodyLinks(body, lang),
    };
  });
  // Newest first.
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return posts;
}

// Analytics (Umami, cookieless, self-hosted) + QuietJar donation widget.
// Shared by the app page and all blog pages; headline is localized per lang.
// QuietJar is switched off for now; flip to true to show the widget again.
const QUIETJAR_ENABLED = false;

function thirdPartyScripts(headline) {
  const umami = '<script defer src="https://umami.sotec.app/script.js" data-website-id="2c0fd1dc-6440-4e0b-961b-3f0c84f343eb"></script>';
  if (!QUIETJAR_ENABLED) return umami;
  const quietJar = {
    site: 'qj_ae2a4ff5e98980524f9dc1cb',
    currency: 'eur',
    labels: { headline, body: '', action: 'Support', icon: 'piggy' },
    style: { color: '#0369a1', font: 'rounded' },
    close: { enabled: true, after: 'session', days: 7 },
    donation: { hideDays: 30 },
    position: { corner: 'bottom-right' },
  };
  const json = JSON.stringify(quietJar).replace(/</g, '\\u003c');
  return [
    umami,
    `<script>window.QuietJar = ${json};</script>`,
    '<script src="https://quietjar.com/js/latest/quietjar.js" async></script>',
  ].join('\n');
}

// One site-wide navigation, rendered identically at the top of every page:
// QR generator, promo codes, team guide, blog – always in this order.
// `current` is one of 'home' | 'promo' | 'teams' | 'blog'.
const NAV_ITEMS = [
  { id: 'home', icon: '🔲', key: 'blogNavGenerator', path: '' },
  { id: 'promo', icon: '🎁', key: 'navPromo', path: 'promo-codes/' },
  { id: 'teams', icon: '⚔️', key: 'navTeams', path: 'teams/' },
  { id: 'blog', icon: '📖', key: 'blogNavBlog', path: 'blog/' },
];

function siteNav(dict, lang, current, exactPage = true) {
  const prefix = lang === DEFAULT_LANG ? '/' : `/${lang}/`;
  const links = NAV_ITEMS.map((item) => {
    const active = item.id === current;
    const attrs = active
      ? ` class="snav-item active"${exactPage ? ' aria-current="page"' : ''}`
      : ' class="snav-item"';
    const label = String(dict[item.key]).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `    <a${attrs} href="${prefix}${item.path}"><span class="snav-icon" aria-hidden="true">${item.icon}</span>` +
      `<span class="snav-label" data-i18n="${item.key}">${label}</span></a>`;
  });
  return `<nav class="snav" aria-label="dblqr.org">\n${links.join('\n')}\n  </nav>`;
}

const SITE_NAV_CSS = `
.snav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  max-width: 760px;
  margin: 0 auto 24px;
  padding: 5px;
  border: 1.5px solid var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--panel-2), var(--panel));
}
.snav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 52px;
  padding: 6px 4px;
  border-radius: 11px;
  color: var(--dim);
  text-decoration: none;
  text-align: center;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.15;
}
.snav-icon { font-size: 1.15rem; line-height: 1; }
.snav-label { hyphens: auto; -webkit-hyphens: auto; overflow-wrap: break-word; max-width: 100%; }
.snav-item:hover { color: var(--orange-soft); }
.snav-item.active { color: #26130a; background: linear-gradient(180deg, var(--orange-soft), var(--orange)); }
.snav-item:focus-visible { outline: 2px solid var(--orange); outline-offset: 2px; }
@media (min-width: 640px) {
  .snav-item { flex-direction: row; gap: 7px; font-size: 0.9rem; min-height: 44px; }
}
`;

module.exports = {
  siteNav,
  SITE_NAV_CSS,
  thirdPartyScripts,
  loadPosts,
  splitH1Html,
  SITE_URL,
  DEFAULT_LANG,
  blogPathForLang,
  blogUrlForLang,
  homePathForLang,
  postPath,
  postUrl,
  // Back-compat: URL of the default (English) blog.
  BLOG_URL: blogUrlForLang(DEFAULT_LANG),
};
