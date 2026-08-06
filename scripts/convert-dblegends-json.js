#!/usr/bin/env node
/*
 * Converts a full character export of dblegends.net (English site) into
 * src/teams/data/characters-source.json for import-roster.js.
 *
 * Usage: node scripts/convert-dblegends-json.js path/to/dblegends_full.json
 *
 * Expected input: { source, generated, count, characters: [{ name, card_id,
 * element, rarity, legends_limited, zenkai, tags }] } as written by
 * scripts/scrape_dblegends.py. English tags pass through unchanged; German
 * tags (a scrape of de.dblegends.net via --base) are translated.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'teams', 'data', 'characters-source.json');

const TAG_DE = require('./tag-map-de.js');
const EN_TAGS = new Set(Object.values(TAG_DE));

const ELEMENT = { Blue: 'BLU', Yellow: 'YEL', Green: 'GRN', Red: 'RED', Purple: 'PUR', Light: 'LGT' };

const decode = (s) => s
  .replace(/&amp;/g, '&')
  .replace(/&#39;|&apos;/g, '’')
  .replace(/&quot;/g, '"');

const mapTag = (t) => (EN_TAGS.has(t) ? t : TAG_DE[t]);

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/convert-dblegends-json.js path/to/dblegends_full.json');
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const characters = input.characters.map((c) => {
    const plus = c.element.endsWith('+') ? '+' : '';
    // Strike vs blast leaning from the min-level attack stats; within 5%
    // counts as mixed.
    const lm = (c.stats && c.stats.level_min) || {};
    const stat = lm.sa > (lm.ba || 0) * 1.05 ? 'strike'
      : (lm.ba || 0) > (lm.sa || 0) * 1.05 ? 'blast' : 'mixed';
    return {
      name: decode(c.name),
      id: c.card_id,
      color: (ELEMENT[c.element.replace('+', '')] || c.element) + plus,
      rarity: c.rarity,
      is_lf: !!c.legends_limited,
      is_zenkai: !!c.zenkai,
      stat,
      tags: [...new Set(c.tags.map(mapTag).filter(Boolean))],
    };
  });

  if (characters.length < 600) {
    throw new Error(`Only ${characters.length} characters parsed; input format changed?`);
  }
  fs.writeFileSync(OUT, JSON.stringify(characters, null, 1) + '\n', 'utf8');
  console.log(`Wrote ${characters.length} characters (source: ${input.source}, state: ${input.generated})`);
}

main();
