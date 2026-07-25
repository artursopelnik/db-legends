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

module.exports = {
  loadPosts,
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
