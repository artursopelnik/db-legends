#!/usr/bin/env node
/*
 * Generates the team-guide page for every supported language from src/teams/.
 * - Reads curated team data from src/teams/teams.json via teams-lib.js.
 * - Emits: {lang-prefix}/teams/index.html ({lang-prefix} is empty for English
 *   so the URL stays /teams/).
 * - Injects: hreflang across languages, canonical, ItemList + BreadcrumbList
 *   JSON-LD, shared blog CSS, localized nav / CTA / footer text from i18n.js.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'teams');

const { loadTeams, loadCharacters, teamsPathForLang, teamsUrlForLang, SITE_URL, DEFAULT_LANG } =
  require('./teams-lib.js');
const { blogPathForLang, homePathForLang } = require('./blog-lib.js');
const { promoPathForLang } = require('./promo-lib.js');
const { I18N, SUPPORTED_LANGS } = require(path.join(ROOT, 'i18n.js'));

const OG_LOCALE = {
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ru: 'ru_RU',
  ja: 'ja_JP',
};

const MONTH_NAMES = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
    'August', 'September', 'Oktober', 'November', 'Dezember'],
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  pt: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
    'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
    'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  ja: null, // handled specially: YYYY年M月D日
};

function humanDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  if (lang === 'ja') return `${y}年${m}月${d}日`;
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  if (lang === 'en') return `${months[m - 1]} ${d}, ${y}`;
  if (lang === 'de') return `${d}. ${months[m - 1]} ${y}`;
  if (lang === 'es' || lang === 'pt') return `${d} de ${months[m - 1]} de ${y}`;
  if (lang === 'fr') return `${d} ${months[m - 1]} ${y}`;
  if (lang === 'ru') return `${d} ${months[m - 1]} ${y} г.`;
  return `${d} ${months[m - 1]} ${y}`;
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

function buildHreflang() {
  const lines = SUPPORTED_LANGS.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${teamsUrlForLang(l)}">`,
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${teamsUrlForLang(DEFAULT_LANG)}">`);
  return lines.join('\n');
}

function buildOgLocaleAlternates(currentLang) {
  return SUPPORTED_LANGS
    .filter((l) => l !== currentLang)
    .map((l) => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`)
    .join('\n');
}

function teamsJsonLd(lang, data) {
  const dict = I18N[lang];
  const url = teamsUrlForLang(lang);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: dict.teamsH1,
    description: dict.teamsMetaDescription,
    url,
    inLanguage: lang,
    itemListElement: data.teams.map((team, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${team.tag} Team`,
      url: `${url}#${team.slug}`,
    })),
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'DBL QR Generator', item: `${SITE_URL}${homePathForLang(lang)}` },
      { '@type': 'ListItem', position: 2, name: dict.navTeams, item: url },
    ],
  };
  return [itemList, breadcrumbs]
    .map((o) => `<script type="application/ld+json">${jsonSafe(o)}</script>`)
    .join('\n');
}

function bestBadgeText(lang, updatedAt) {
  const [y, m] = updatedAt.split('-').map(Number);
  const date = lang === 'ja' ? `${y}年${m}月` : `${(MONTH_NAMES[lang] || MONTH_NAMES.en)[m - 1]} ${y}`;
  return I18N[lang].teamsBestBadge.replace('{date}', date);
}

function renderTeamCard(team, lang, badge) {
  const dict = I18N[lang];
  const roleLabel = {
    damage: dict.teamsRoleDamage,
    tank: dict.teamsRoleTank,
    support: dict.teamsRoleSupport,
  };
  const core = team.core
    .map(
      (f) => `      <li><span class="fighter-name">${escapeHtmlText(f.name)}</span>` +
        `<span class="role-chip role-${f.role}">${escapeHtmlText(roleLabel[f.role])}</span></li>`,
    )
    .join('\n');
  const text = team.text[lang];
  const body = `    <p>${escapeHtmlText(text.why)}</p>
    <h3>${escapeHtmlText(dict.teamsCoreLabel)}</h3>
    <ul class="fighter-list">
${core}
    </ul>
    <h3>${escapeHtmlText(dict.teamsBenchLabel)}</h3>
    <p class="bench-list">${team.bench.map(escapeHtmlText).join(' · ')}</p>
    <h3>${escapeHtmlText(dict.teamsEquipLabel)}</h3>
    <p>${escapeHtmlText(text.equip)}</p>`;
  if (badge) {
    return `  <section class="team-card team-card-best" id="${team.slug}">
    <p class="best-badge">🏆 ${escapeHtmlText(badge)}</p>
    <h2>${team.emoji} ${escapeHtmlText(team.tag)}</h2>
${body}
  </section>`;
  }
  return `  <details class="team-card" id="${team.slug}">
    <summary><h2>${team.emoji} ${escapeHtmlText(team.tag)}</h2></summary>
${body}
  </details>`;
}

// Card icons come from assets/card_icons when scripts/fetch_card_icons.py has
// filled it (self hosted, preferred); otherwise the pages hotlink the source
// database directly so the builder still shows images.
function iconBase() {
  const dir = path.join(ROOT, 'assets', 'card_icons');
  const local = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.webp'));
  return local ? '/assets/card_icons/' : 'https://dblegends.net/assets/card_icons/';
}

function loadEquipsByTag() {
  return JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'equips-by-tag.json'), 'utf8'));
}

function renderPage(template, css, lang, data, characters, equips) {
  const dict = I18N[lang];
  const cards = data.teams
    .map((team, i) => renderTeamCard(team, lang, i === 0 ? bestBadgeText(lang, data.updatedAt) : null))
    .join('\n');
  const builderText = {
    count: dict.builderCount,
    roleDamage: dict.teamsRoleDamage,
    roleTank: dict.teamsRoleTank,
    roleSupport: dict.teamsRoleSupport,
    verdictGreat: dict.builderVerdictGreat,
    verdictOk: dict.builderVerdictOk,
    verdictWeak: dict.builderVerdictWeak,
    recPerfect: dict.builderRecPerfect,
    recSwap: dict.builderRecSwap,
    recRoleDamage: dict.builderRecRoleDamage,
    recRoleTank: dict.builderRecRoleTank,
    recRoleSupport: dict.builderRecRoleSupport,
    recFill: dict.builderRecFill,
    recLead: dict.builderRecLead,
    recLeadBase: dict.builderRecLeadBase,
    recLeadOk: dict.builderRecLeadOk,
    recEquipParts: dict.builderRecEquipParts,
    recEquipPartsNoTag: dict.builderRecEquipPartsNoTag,
    equipStrike: dict.builderEquipStrike,
    equipBlast: dict.builderEquipBlast,
    equipMixed: dict.builderEquipMixed,
    equipDefense: dict.builderEquipDefense,
    recEquipItems: dict.builderRecEquipItems,
    starsLabel: dict.builderStarsLabel,
    moveUp: dict.builderMoveUp,
    moveDown: dict.builderMoveDown,
    scanLoading: dict.builderScanLoading,
    scanAnalyzing: dict.builderScanAnalyzing,
    scanDone: dict.builderScanDone,
    scanNone: dict.builderScanNone,
    scanUnavailable: dict.builderScanUnavailable,
    scanSlot: dict.builderScanSlot,
    scanUncertain: dict.builderScanUncertain,
  };
  return template
    .replaceAll('{{LANG}}', lang)
    .replaceAll('{{META_TITLE}}', escapeHtmlAttr(dict.teamsMetaTitle))
    .replaceAll('{{META_DESCRIPTION}}', escapeHtmlAttr(dict.teamsMetaDescription))
    .replaceAll('{{OG_TITLE}}', escapeHtmlAttr(dict.teamsH1))
    .replaceAll('{{CANONICAL}}', teamsUrlForLang(lang))
    .replaceAll('{{HREFLANG}}', buildHreflang())
    .replaceAll('{{OG_LOCALE}}', OG_LOCALE[lang])
    .replaceAll('{{OG_LOCALE_ALTERNATES}}', buildOgLocaleAlternates(lang))
    .replaceAll('{{JSON_LD}}', teamsJsonLd(lang, data))
    .replaceAll('{{BLOG_CSS}}', css)
    .replaceAll('{{HOME_URL}}', homePathForLang(lang))
    .replaceAll('{{BLOG_URL}}', blogPathForLang(lang))
    .replaceAll('{{NAV_BLOG_LABEL}}', escapeHtmlText(dict.blogNavBlog))
    .replaceAll('{{NAV_GENERATOR_LABEL}}', escapeHtmlText(dict.blogNavGenerator))
    .replaceAll('{{PROMO_URL}}', promoPathForLang(lang))
    .replaceAll('{{NAV_PROMO_LABEL}}', escapeHtmlText(dict.navPromo))
    .replaceAll('{{TEAMS_H1}}', escapeHtmlText(dict.teamsH1))
    .replaceAll('{{TEAMS_INTRO}}', escapeHtmlText(dict.teamsIntro))
    .replaceAll('{{UPDATED_LABEL}}', escapeHtmlText(dict.blogPostUpdatedLabel))
    .replaceAll('{{UPDATED_ISO}}', data.updatedAt)
    .replaceAll('{{UPDATED_HUMAN}}', humanDate(data.updatedAt, lang))
    .replaceAll('{{TEAMS_DISCLAIMER}}', escapeHtmlText(dict.teamsDisclaimer))
    .replaceAll('{{BUILDER_HEADING}}', escapeHtmlText(dict.builderHeading))
    .replaceAll('{{BUILDER_INTRO}}', escapeHtmlText(dict.builderIntro))
    .replaceAll('{{BUILDER_EMPTY}}', escapeHtmlText(dict.builderEmpty))
    .replaceAll('{{BUILDER_SHARED_TAGS}}', escapeHtmlText(dict.builderSharedTags))
    .replaceAll('{{BUILDER_ROLES}}', escapeHtmlText(dict.builderRoles))
    .replaceAll('{{BUILDER_TIPS}}', escapeHtmlText(dict.builderTips))
    .replaceAll('{{BUILDER_CLEAR}}', escapeHtmlText(dict.builderClear))
    .replaceAll('{{BUILDER_SCAN_BUTTON}}', escapeHtmlText(dict.builderScanButton))
    .replaceAll('{{BUILDER_SCAN_HINT}}', escapeHtmlText(dict.builderScanHint))
    .replaceAll('{{BUILDER_SEARCH}}', escapeHtmlAttr(dict.builderSearch))
    .replaceAll('{{BUILDER_FILTER_ALL}}', escapeHtmlText(dict.builderFilterAll))
    .replaceAll('{{BUILDER_FILTER_RARITY}}', escapeHtmlText(dict.builderFilterRarity))
    .replaceAll('{{ICON_BASE}}', iconBase())
    .replaceAll('{{BUILDER_NO_MATCHES}}', escapeHtmlText(dict.builderNoMatches))
    .replaceAll('{{ROSTER_JSON}}', jsonSafe(characters))
    .replaceAll('{{EQUIPS_JSON}}', jsonSafe(equips))
    .replaceAll('{{BUILDER_TEXT_JSON}}', jsonSafe(builderText))
    .replaceAll('{{CTA_HTML}}', dict.blogIndexCtaHtml)
    .replaceAll('{{CTA_BTN}}', escapeHtmlText(dict.blogIndexCtaBtn))
    .replaceAll('{{FOOTER_DISCLAIMER}}', escapeHtmlText(dict.blogFooterDisclaimer))
    .replaceAll('{{LEGAL_NOTICE_LABEL}}', escapeHtmlText(dict.legalNotice))
    .replaceAll('{{PRIVACY_LABEL}}', escapeHtmlText(dict.privacy))
    .replace('{{TEAM_CARDS}}', cards);
}

function checkNoLeftoverTokens(html, name) {
  const leftover = html.match(/\{\{[A-Z_][A-Z0-9_]*\}\}/);
  if (leftover) throw new Error(`${name}: unresolved token ${leftover[0]}`);
}

function outDirForLang(lang) {
  return lang === DEFAULT_LANG
    ? path.join(ROOT, 'teams')
    : path.join(ROOT, lang, 'teams');
}

function main() {
  const data = loadTeams(SUPPORTED_LANGS);
  const characters = loadCharacters();
  const equips = loadEquipsByTag();
  const css = fs.readFileSync(path.join(ROOT, 'src', 'blog', 'blog.css'), 'utf8').trim();
  const template = fs.readFileSync(path.join(SRC, 'index.template.html'), 'utf8');
  for (const lang of SUPPORTED_LANGS) {
    const html = renderPage(template, css, lang, data, characters, equips);
    checkNoLeftoverTokens(html, `${lang}/teams/index`);
    const outDir = outDirForLang(lang);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, path.join(outDir, 'index.html'))}`);
  }
}

main();
