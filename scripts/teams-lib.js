/*
 * Shared helpers for the team-guide build: loads src/teams/teams.json and
 * derives per-language URLs. Used by build-teams.js (rendering) and
 * build-i18n.js (sitemap).
 *
 * teams.json format: { updatedAt: "YYYY-MM-DD", teams: [{ slug, tag, emoji,
 * core: [{name, role}], bench: [name], text: { [lang]: { why, equip } } }] }.
 * Every team must provide text for every supported language.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEAMS_JSON = path.join(ROOT, 'src', 'teams', 'teams.json');
const SITE_URL = 'https://dblqr.org';
const DEFAULT_LANG = 'en';

const ROLES = ['damage', 'tank', 'support'];

function teamsPathForLang(lang) {
  return lang === DEFAULT_LANG ? '/teams/' : `/${lang}/teams/`;
}

function teamsUrlForLang(lang) {
  return `${SITE_URL}${teamsPathForLang(lang)}`;
}

function loadTeams(supportedLangs) {
  const data = JSON.parse(fs.readFileSync(TEAMS_JSON, 'utf8'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt || '')) {
    throw new Error('teams.json: updatedAt must be YYYY-MM-DD');
  }
  if (!Array.isArray(data.teams) || !data.teams.length) {
    throw new Error('teams.json: no teams defined');
  }
  for (const team of data.teams) {
    for (const key of ['slug', 'tag', 'emoji']) {
      if (!team[key]) throw new Error(`teams.json: team is missing "${key}"`);
    }
    if (!Array.isArray(team.core) || team.core.length !== 3) {
      throw new Error(`teams.json: team "${team.slug}" must have exactly 3 core fighters`);
    }
    for (const fighter of team.core) {
      if (!fighter.name) throw new Error(`teams.json: "${team.slug}" has a core fighter without name`);
      if (!ROLES.includes(fighter.role)) {
        throw new Error(`teams.json: "${team.slug}" has invalid role "${fighter.role}"`);
      }
    }
    if (!Array.isArray(team.bench) || !team.bench.length) {
      throw new Error(`teams.json: team "${team.slug}" needs bench fighters`);
    }
    for (const lang of supportedLangs) {
      const text = team.text && team.text[lang];
      if (!text || !text.why || !text.equip) {
        throw new Error(`teams.json: team "${team.slug}" is missing text for lang "${lang}"`);
      }
    }
  }
  return data;
}

module.exports = {
  loadTeams,
  teamsPathForLang,
  teamsUrlForLang,
  SITE_URL,
  DEFAULT_LANG,
};
