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

const ELEMENT = { Blue: 'BLU', Yellow: 'YEL', Green: 'GRN', Red: 'RED', Purple: 'PUR', Light: 'LGT' };

// German site tags -> the English tag names import-roster.js knows.
// Battle styles are passed through in English so the role detection works.
const TAG_DE = {
  'Schlagangriffstyp': 'Melee Type',
  'Fernangriffstyp': 'Ranged Type',
  'Verteidigungstyp': 'Defense Type',
  'Unterstützungstyp': 'Support Type',
  'Saiyajin': 'Saiyan',
  'Halb-Saiyajin': 'Hybrid Saiyan',
  'Son-Familie': 'Son Family',
  'Vegeta-Clan': 'Vegeta Clan',
  'Göttliches Ki': 'God Ki',
  'Fusionierter Kämpfer': 'Fusion Warrior',
  'Zukunft': 'Future',
  'GT': 'GT',
  'DAIMA': 'DAIMA',
  'Erneuerung': 'Regeneration',
  'Cyborg': 'Android',
  'Böse Abstammung': 'Lineage of Evil',
  'Mächtiger Feind': 'Powerful Opponent',
  'Kinoversion-Saga': 'Sagas From the Movies',
  'Kinoversion-Saga (SUPER HERO)': 'Sagas From the Movies',
  'Mädels': 'Girls',
  'Weiblich': 'Female',
  'Super-Saiyajin': 'Super Saiyan',
  'Super-Saiyajin 2': 'Super Saiyan 2',
  'Super-Saiyajin 3': 'Super Saiyan 3',
  'Super-Saiyajin 4': 'Super Saiyan 4',
  'Super-Saiyajin-Gott': 'Super Saiyan God',
  'Super-Saiyajin Blue': 'Super Saiyan God SS',
  'Super-Saiyajin Rosé': 'Super Saiyan Rosé',
  'Verwandelter Kämpfer': 'Transforming Warrior',
  'Kämpfer des Jenseits': 'Otherworld Warrior',
  'Freezer-Armee': 'Frieza Force',
  'Ginyu-Kommando': 'Ginyu Force',
  'Namekianer': 'Namekian',
  'Kids': 'Kids',
  'Minion': 'Minion',
  'Gegnerisches Universum': 'Rival Universe',
  'Universums-Repräsentant': 'Universe Rep',
  '2. Universum': 'Universe 2',
  '4. Universum': 'Universe 4',
  '6. Universum': 'Universe 6',
  '9. Universum': 'Universe 9',
  '11. Universum': 'Universe 11',
  'Potara': 'Potara',
  'Superkämpfer': 'Super Warrior',
  'Bardocks Team': 'Team Bardock',
  'Volk der Hera': 'Hera Clan',
  'Teufelsdrachen': 'Shadow Dragon',
  'Legends Road': 'Legends Road',
  'Spiel-Original': 'Game Originals',
  'Engel': 'Angel',
  'Gott der Zerstörung': 'God of Destruction',
  'Waffenträger': 'Weapon Wielder',
  'Turles-Armee': 'Turles Crusher Corps',
};

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
    return {
      name,
      id: c.card_id,
      color: (ELEMENT[c.element.replace('+', '')] || c.element) + plus,
      rarity: c.rarity,
      is_lf: !!c.legends_limited,
      is_zenkai: !!c.zenkai,
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
