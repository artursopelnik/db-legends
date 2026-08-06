#!/usr/bin/env node
/*
 * Converts a full character export of de.dblegends.net into
 * src/teams/data/characters-source.json for import-roster.js.
 *
 * Usage: node scripts/convert-dblegends-json.js path/to/dblegends_full.json
 *
 * Expected input: { source, generated, count, characters: [{ name, card_id,
 * element, rarity, legends_limited, zenkai, tags: [...german tags] }] }.
 * English display names come from src/teams/data/names-en.json (card_id ->
 * name); units missing there fall back to the German name and are listed so
 * the map can be extended.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'teams', 'data');
const OUT = path.join(DATA, 'characters-source.json');

const TAG_DE = require('./tag-map-de.js');

const ELEMENT = { Blue: 'BLU', Yellow: 'YEL', Green: 'GRN', Red: 'RED', Purple: 'PUR', Light: 'LGT' };

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node scripts/convert-dblegends-json.js path/to/dblegends_full.json');
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const namesEn = JSON.parse(fs.readFileSync(path.join(DATA, 'names-en.json'), 'utf8'));

  const decode = (s) => s.replace(/&amp;/g, '&');
  const missing = [];
  const characters = input.characters.map((c) => {
    let name = namesEn[c.card_id];
    if (!name) {
      name = decode(c.name);
      missing.push(`${c.card_id}: ${name}`);
    }
    const plus = c.element.endsWith('+') ? '+' : '';
    // Strike vs blast leaning from the min-level attack stats; within 5%
    // counts as mixed.
    const lm = (c.stats && c.stats.level_min) || {};
    const stat = lm.sa > (lm.ba || 0) * 1.05 ? 'strike'
      : (lm.ba || 0) > (lm.sa || 0) * 1.05 ? 'blast' : 'mixed';
    return {
      name,
      id: c.card_id,
      color: (ELEMENT[c.element.replace('+', '')] || c.element) + plus,
      rarity: c.rarity,
      is_lf: !!c.legends_limited,
      is_zenkai: !!c.zenkai,
      stat,
      tags: [...new Set(c.tags.map((t) => TAG_DE[t]).filter(Boolean))],
    };
  });

  if (characters.length < 600) {
    throw new Error(`Only ${characters.length} characters parsed; input format changed?`);
  }
  fs.writeFileSync(OUT, JSON.stringify(characters, null, 1) + '\n', 'utf8');
  console.log(`Wrote ${characters.length} characters (source: ${input.source}, state: ${input.generated})`);
  if (missing.length) {
    console.log(`${missing.length} units have no English name yet (add them to names-en.json):`);
    missing.forEach((m) => console.log('  ' + m));
  }
}

main();
