#!/usr/bin/env node
/*
 * Generates the English blog from src/blog/.
 * - Reads posts (HTML fragments with front matter) via blog-lib.js.
 * - Emits: blog/index.html + blog/{slug}/index.html.
 * - Injects: canonical, OG article tags, BlogPosting + BreadcrumbList JSON-LD,
 *   shared blog CSS, related-posts links.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'blog');
const OUT = path.join(ROOT, 'blog');

const { loadPosts, SITE_URL, BLOG_URL } = require('./blog-lib.js');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

function humanDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
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

function postJsonLd(post) {
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    url: post.url,
    mainEntityOfPage: post.url,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: 'en',
    image: `${SITE_URL}/icons/icon-512.png`,
    author: { '@type': 'Person', name: 'Artur Sopelnik', url: 'https://artursopelnik.de/' },
    publisher: { '@type': 'Organization', name: 'dblqr.org', url: `${SITE_URL}/` },
    isPartOf: { '@type': 'Blog', name: 'Dragon Ball Legends Guides', url: BLOG_URL },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DBL QR Generator', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: BLOG_URL },
      { '@type': 'ListItem', position: 3, name: post.title, item: post.url },
    ],
  };
  return [blogPosting, breadcrumbs]
    .map((o) => `<script type="application/ld+json">${jsonSafe(o)}</script>`)
    .join('\n');
}

function indexJsonLd(posts) {
  const blog = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Dragon Ball Legends Guides',
    url: BLOG_URL,
    description:
      'Guides for Dragon Ball Legends: scanning friend QR codes, friend codes, promo codes and summoning Shenron.',
    inLanguage: 'en',
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
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => `      <li><a href="${p.path}">${escapeHtmlText(p.title)}</a></li>`)
    .join('\n');
  return template
    .replaceAll('{{TITLE}}', escapeHtmlAttr(post.title))
    .replaceAll('{{DESCRIPTION}}', escapeHtmlAttr(post.description))
    .replaceAll('{{CANONICAL}}', post.url)
    .replaceAll('{{DATE_ISO}}', post.date)
    .replaceAll('{{UPDATED_ISO}}', post.updated)
    .replaceAll('{{UPDATED_HUMAN}}', humanDate(post.updated))
    .replaceAll('{{JSON_LD}}', postJsonLd(post))
    .replaceAll('{{BLOG_CSS}}', css)
    .replace('{{RELATED}}', related)
    .replace('{{CONTENT}}', post.body);
}

function renderIndex(template, css, posts) {
  const list = posts
    .map(
      (p) => `    <li class="post-card">
      <h2><a href="${p.path}">${escapeHtmlText(p.title)}</a></h2>
      <p class="post-meta">${humanDate(p.updated)}</p>
      <p>${escapeHtmlText(p.description)}</p>
    </li>`,
    )
    .join('\n');
  return template
    .replaceAll('{{JSON_LD}}', indexJsonLd(posts))
    .replaceAll('{{BLOG_CSS}}', css)
    .replace('{{POST_LIST}}', list);
}

function checkNoLeftoverTokens(html, name) {
  const leftover = html.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
  if (leftover) throw new Error(`${name}: unresolved token ${leftover[0]}`);
}

function main() {
  const css = fs.readFileSync(path.join(SRC, 'blog.css'), 'utf8').trim();
  const postTemplate = fs.readFileSync(path.join(SRC, 'post.template.html'), 'utf8');
  const indexTemplate = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
  const posts = loadPosts();

  for (const post of posts) {
    const html = renderPost(postTemplate, css, post, posts);
    checkNoLeftoverTokens(html, post.slug);
    const dir = path.join(OUT, post.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log(`Wrote blog/${post.slug}/index.html`);
  }

  const indexHtml = renderIndex(indexTemplate, css, posts);
  checkNoLeftoverTokens(indexHtml, 'blog/index');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), indexHtml, 'utf8');
  console.log('Wrote blog/index.html');
}

main();
