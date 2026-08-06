#!/usr/bin/env node
/*
 * Generates src/teams/characters.json (the team-builder roster) from:
 * - src/teams/data/characters-source.json: trimmed snapshot of the community
 *   dataset scraped from DBZ Space (github.com/feijoes/DBlegendsAPI),
 *   covering releases up to set DBL59 (mid 2023).
 * - src/teams/data/roster-extra.json: hand-maintained units missing from the
 *   snapshot (newer releases and scraper gaps). Add new banner units here.
 *
 * Run manually after changing either input: node scripts/import-roster.js
 * Then rebuild the pages with: npm run build
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src', 'teams', 'data');
const OUT = path.join(ROOT, 'src', 'teams', 'characters.json');

// Official game tags that matter for team building, mapped to the names the
// site displays. Mechanic tags (arts, gauges, colors, sagas) are dropped.
const TAG_MAP = {
  'Saiyan': 'Saiyan',
  'Hybrid Saiyan': 'Hybrid Saiyan',
  'Son Family': 'Son Family',
  'Vegeta Clan': 'Vegeta Family',
  'God Ki': 'God Ki',
  'Fusion Warrior': 'Fusion Warrior',
  'Future': 'Future',
  'GT': 'GT',
  'DAIMA': 'DAIMA',
  'Regeneration': 'Regeneration',
  'Android': 'Android',
  'Lineage of Evil': 'Lineage of Evil',
  'Powerful Opponent': 'Powerful Opponent',
  'Sagas From the Movies': 'Movies',
  'Girls': 'Girls',
  'Female': 'Girls',
  'Super Saiyan': 'Super Saiyan',
  'Super Saiyan 2': 'Super Saiyan 2',
  'Super Saiyan 3': 'Super Saiyan 3',
  'Super Saiyan 4': 'Super Saiyan 4',
  'Super Saiyan God': 'Super Saiyan God',
  'Super Saiyan God SS': 'Super Saiyan God SS',
  'Transforming Warrior': 'Transforming Warrior',
  'Otherworld Warrior': 'Otherworld Warrior',
  'Frieza Force': 'Frieza Force',
  'Ginyu Force': 'Ginyu Force',
  'Namekian': 'Namekian',
  'Kids': 'Kids',
  'Minion': 'Minion',
  'Rival Universe': 'Rival Universe',
  'Universe Rep': 'Universe Rep',
  'Universe 2': 'Universe 2',
  'Universe 6': 'Universe 6',
  'Universe 11': 'Universe 11',
  'Potara': 'Potara',
  'Super Warrior': 'Super Warrior',
  'Team Bardock': 'Team Bardock',
  'Hera Clan': 'Hera Clan',
  'Shadow Dragon': 'Shadow Dragon',
  'Legends Road': 'Legends Road',
  'Game Originals': 'Game Originals',
};

const RARITY_PREFIX = { UL: 'ULTRA', LF: 'LF', SP: 'SP', EX: 'EX', HE: 'HE' };
const RARITY_ORDER = { UL: 0, LF: 1, SP: 2, EX: 3, HE: 4 };

function shortRarity(entry) {
  if (entry.rarity === 'ULTRA') return 'UL';
  if (entry.is_lf) return 'LF';
  if (entry.rarity === 'SPARKING') return 'SP';
  if (entry.rarity === 'EXTREME') return 'EX';
  return 'HE';
}

function roleFromTags(tags) {
  if (tags.includes('Defense Type')) return 'tank';
  if (tags.includes('Support Type')) return 'support';
  return 'damage';
}

function mapTags(tags) {
  const out = [];
  for (const tag of tags) {
    const mapped = TAG_MAP[tag];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  // A few early units predate the modern team tags entirely.
  return out.length ? out : ['Other'];
}

function main() {
  const source = JSON.parse(fs.readFileSync(path.join(DATA, 'characters-source.json'), 'utf8'));
  const extras = JSON.parse(fs.readFileSync(path.join(DATA, 'roster-extra.json'), 'utf8'));

  // The dataset keeps exact duplicates of a few units; drop them by id.
  const seenIds = new Set();
  const deduped = source.filter((entry) => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  const fromSource = deduped.map((entry) => {
    const rarity = shortRarity(entry);
    return {
      name: `${RARITY_PREFIX[rarity]} ${entry.name}`,
      color: entry.color,
      id: entry.id,
      rarity,
      role: roleFromTags(entry.tags),
      tags: mapTags(entry.tags),
    };
  });

  const all = fromSource.concat(extras.characters.map((c) => ({ ...c })));

  // Same display name at the same rarity (e.g. three "SP Final Form Frieza")
  // gets the element appended; if that still collides, the set id decides.
  const suffix = (counts, keyFn, extend) => {
    all.forEach((c) => { counts[keyFn(c)] = (counts[keyFn(c)] || 0) + 1; });
    all.forEach((c) => { if (counts[keyFn(c)] > 1) extend(c); });
  };
  suffix({}, (c) => c.name, (c) => { if (c.color) c.name = `${c.name} (${c.color})`; });
  suffix({}, (c) => c.name, (c) => { if (c.id) c.name = `${c.name} [${c.id}]`; });

  all.sort((a, b) =>
    RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.name.localeCompare(b.name));

  const characters = all.map(({ name, rarity, role, tags }) => ({ name, rarity, role, tags }));
  fs.writeFileSync(OUT, JSON.stringify({ characters }, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${characters.length} characters to ${path.relative(ROOT, OUT)}`);
}

main();
