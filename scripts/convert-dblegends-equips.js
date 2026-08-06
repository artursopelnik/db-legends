#!/usr/bin/env node
/*
 * Converts the equipment export of de.dblegends.net into
 * src/teams/data/equips-by-tag.json: for every team tag the builder knows,
 * the strongest equips whose condition matches that tag.
 *
 * Usage: node scripts/convert-dblegends-equips.js path/to/dblegends_equipment.json
 *
 * Rarity in the export: 4 = platinum/awakened (best regular gear), 3 = gold.
 * Rarities 5 and 6 are event items (drop boosters), not combat gear, and are
 * skipped. Exits gracefully when the input file is missing so
 * `npm run update-roster` also works without a fresh equipment scrape.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TAG_DE = require('./tag-map-de.js');
const EN_TAGS = new Set(Object.values(TAG_DE));

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'teams', 'data', 'equips-by-tag.json');
const TOP_N = 3;

// Second stage of the tag renaming, mirroring import-roster.js.
const FINAL_NAME = {
  'Vegeta Clan': 'Vegeta Family',
  'Sagas From the Movies': 'Movies',
  'Female': 'Girls',
};
const STYLE_TAGS = new Set(['Melee Type', 'Ranged Type', 'Defense Type', 'Support Type']);

function main() {
  const inputPath = process.argv[2];
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.log(`Equipment export not found (${inputPath || 'no path given'}); keeping existing ${path.relative(ROOT, OUT)}`);
    return;
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, '’').replace(/&quot;/g, '"');
  const byTag = {};
  const usable = input.equipment
    .filter((e) => e.rarity === 3 || e.rarity === 4)
    .sort((a, b) => b.rarity - a.rarity || b.id - a.id);

  for (const equip of usable) {
    // conditions is a list of alternatives; every German tag appearing in any
    // alternative makes the equip relevant for that tag.
    const condTags = new Set((equip.conditions || []).flat());
    for (const raw of condTags) {
      const mapped = EN_TAGS.has(raw) ? raw : TAG_DE[raw];
      if (!mapped || STYLE_TAGS.has(mapped)) continue;
      const tag = FINAL_NAME[mapped] || mapped;
      const list = (byTag[tag] = byTag[tag] || []);
      if (list.length < TOP_N) list.push(decode(equip.name));
    }
  }

  const sorted = Object.fromEntries(Object.keys(byTag).sort().map((k) => [k, byTag[k]]));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 1) + '\n', 'utf8');
  console.log(`Wrote equips for ${Object.keys(sorted).length} tags to ${path.relative(ROOT, OUT)} (source state: ${input.generated})`);
}

main();
