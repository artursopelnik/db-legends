#!/usr/bin/env node
/*
 * Refreshes src/teams/data/characters-source.json from dblegends.net.
 *
 * Requires the session's network policy to allow dblegends.net.
 *
 * Usage:
 *   node scripts/scrape-roster.js --probe   Fetch the listing page only and
 *                                           print what was discovered. Run
 *                                           this first to verify the parser
 *                                           still matches the site markup.
 *   node scripts/scrape-roster.js           Full run: listing plus one detail
 *                                           page per character (rate limited),
 *                                           then rewrite the snapshot.
 *
 * Afterwards: node scripts/import-roster.js && npm run build
 * Units the site already covers can then be removed from roster-extra.json.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'teams', 'data', 'characters-source.json');
const BASE = 'https://dblegends.net';
const DELAY_MS = 300;
const UA = 'dblqr.org roster updater (fan site, contact: artursopelnik.de)';

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

// The listing links every unit as /character/{numeric id}.
function parseListing(html) {
  const ids = new Set();
  for (const m of html.matchAll(/href="(?:https?:\/\/[^"/]+)?\/character\/(\d+)"/g)) {
    ids.add(m[1]);
  }
  return [...ids];
}

// Detail pages carry the unit code in the title ("[DBL90-03U] Super Full
// Power Saiyan 4 Goku"), tag links, and rarity/element as image assets or
// text. Parsing is defensive: every field reports null rather than throwing,
// and the caller counts how many units came back incomplete.
function parseDetail(html) {
  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1] || '';
  const codeMatch = title.match(/\[(DBL[A-Z0-9-]+)\]\s*([^|<]+)/);
  const id = codeMatch ? codeMatch[1].trim() : null;
  const name = codeMatch ? codeMatch[2].trim() : null;

  const tags = [...html.matchAll(/href="[^"]*\/characters\?[^"]*tag[^"]*"[^>]*>([^<]{2,40})</g)]
    .map((m) => m[1].trim());
  if (!tags.length) {
    for (const m of html.matchAll(/class="[^"]*tag[^"]*"[^>]*>([^<]{2,40})</g)) {
      tags.push(m[1].trim());
    }
  }

  const rarityMatch = html.match(/\b(ULTRA|LEGENDS LIMITED|SPARKING|EXTREME|HERO)\b/);
  const colorMatch = html.match(/\b(RED|BLU|GRN|YEL|PUR|LGT|DRK)\b/);

  return {
    id,
    name,
    color: colorMatch ? colorMatch[1] : null,
    rarity: rarityMatch && rarityMatch[1] !== 'LEGENDS LIMITED' ? rarityMatch[1] : 'SPARKING',
    is_lf: /LEGENDS LIMITED|Legends Limited/.test(html) || (id ? /-\d+S$/.test(id) && /is_lf/.test(html) : false),
    tags: [...new Set(tags)],
  };
}

async function main() {
  const probe = process.argv.includes('--probe');

  const listing = await get(`${BASE}/characters`);
  const ids = parseListing(listing);
  console.log(`Listing: found ${ids.length} character links`);

  if (probe) {
    if (!ids.length) {
      console.log('No links matched. First 2000 bytes of the page for inspection:');
      console.log(listing.slice(0, 2000));
      return;
    }
    const sample = await get(`${BASE}/character/${ids[0]}`);
    console.log('Sample detail parse:', JSON.stringify(parseDetail(sample), null, 2));
    return;
  }

  if (!ids.length) throw new Error('Listing parser found no characters; run with --probe and adjust.');

  const characters = [];
  let incomplete = 0;
  for (let i = 0; i < ids.length; i++) {
    await sleep(DELAY_MS);
    try {
      const entry = parseDetail(await get(`${BASE}/character/${ids[i]}`));
      if (!entry.id || !entry.name || !entry.tags.length) incomplete++;
      characters.push(entry);
    } catch (err) {
      incomplete++;
      console.warn(`skip ${ids[i]}: ${err.message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`${i + 1}/${ids.length} fetched`);
  }

  console.log(`Done: ${characters.length} units, ${incomplete} incomplete`);
  if (incomplete > characters.length / 10) {
    throw new Error('Too many incomplete parses; markup changed, not overwriting the snapshot.');
  }
  fs.writeFileSync(OUT, JSON.stringify(characters, null, 1) + '\n', 'utf8');
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
