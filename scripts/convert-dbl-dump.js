#!/usr/bin/env node
/*
 * Converts the PostgreSQL dump from github.com/shamarahDiana/dbl-character-database
 * into src/teams/data/characters-source.json for import-roster.js.
 *
 * Usage: node scripts/convert-dbl-dump.js path/to/database_dump.sql
 *
 * The dump models characters(char_id, name, type_id -> element, rarity_id,
 * is_ll, is_zenkai) with tags(tag_name) joined via charactertags. Tag names
 * include the battle style ("Defense Type" etc.), which import-roster.js
 * turns into the builder role.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'teams', 'data', 'characters-source.json');

// Splits one SQL VALUES tuple, honoring single-quoted strings with '' escapes.
function parseValues(raw) {
  const out = [];
  let cur = '';
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (ch === "'" && raw[i + 1] === "'") { cur += "'"; i++; continue; }
      if (ch === "'") { inString = false; continue; }
      cur += ch;
      continue;
    }
    if (ch === "'") { inString = true; continue; }
    if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function main() {
  const dumpPath = process.argv[2];
  if (!dumpPath) {
    console.error('Usage: node scripts/convert-dbl-dump.js path/to/database_dump.sql');
    process.exit(1);
  }
  const sql = fs.readFileSync(dumpPath, 'utf8');

  const tables = { characters: [], rarities: [], types: [], tags: [], charactertags: [] };
  for (const m of sql.matchAll(/INSERT INTO public\.(\w+) \([^)]*\) VALUES \((.*)\);/g)) {
    const [, table, values] = m;
    if (tables[table]) tables[table].push(parseValues(values));
  }

  const rarityById = Object.fromEntries(tables.rarities.map(([id, name]) => [id, name]));
  const elementById = Object.fromEntries(tables.types.map(([id, name]) => [id, name]));
  const tagById = Object.fromEntries(tables.tags.map(([id, name]) => [id, name]));

  const tagsByChar = {};
  for (const [charId, tagId] of tables.charactertags) {
    (tagsByChar[charId] = tagsByChar[charId] || []).push(tagById[tagId]);
  }

  const characters = tables.characters.map(([charId, name, typeId, rarityId, isLl, isZenkai]) => ({
    name,
    id: `#${charId}`,
    color: elementById[typeId] || null,
    rarity: rarityById[rarityId],
    is_lf: isLl === 'true',
    is_zenkai: isZenkai === 'true',
    tags: tagsByChar[charId] || [],
  }));

  if (characters.length < 500) {
    throw new Error(`Only ${characters.length} characters parsed; dump format changed?`);
  }
  fs.writeFileSync(OUT, JSON.stringify(characters, null, 1) + '\n', 'utf8');
  console.log(`Wrote ${characters.length} characters to ${path.relative(ROOT, OUT)}`);
}

main();
