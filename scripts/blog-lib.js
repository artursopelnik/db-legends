/*
 * Shared helpers for the blog build: loads posts from src/blog/posts and
 * parses their front matter. Used by build-blog.js (rendering) and
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
 * The slug (and URL) is derived from the file name.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'blog', 'posts');
const SITE_URL = 'https://dblqr.org';

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

function loadPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.html'));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { meta, body } = parseFrontMatter(raw, file);
    const slug = file.replace(/\.html$/, '');
    return {
      slug,
      url: `${SITE_URL}/blog/${slug}/`,
      path: `/blog/${slug}/`,
      ...meta,
      body,
    };
  });
  // Newest first.
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
  return posts;
}

module.exports = { loadPosts, SITE_URL, BLOG_URL: `${SITE_URL}/blog/` };
