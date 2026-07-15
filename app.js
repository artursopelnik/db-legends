/*
 * DB Legends QR Generator – Anniversary 2026
 *
 * QR-Format des Dragon Ball Legends Freundes-Scanners:
 *   "4," + friendCode + encodedTimestamp
 * Der Timestamp ist Date.now() als Hex-String, wobei jede Hex-Ziffer auf
 * ein Zeichen aus TIMESTAMP_ALPHABET gemappt wird. Das Spiel erwartet
 * einen frischen Timestamp, daher wird jeder QR-Code bei Bedarf neu
 * generiert statt statisch gespeichert.
 */

const STORAGE_KEY = 'dbl-friends-v1';
const TIMESTAMP_ALPHABET = ['B','C','D','E','F','G','H','J','K','M','N','P','Q','R','S','T'];
const CODE_PATTERN = /^[a-zA-Z0-9]{8,10}$/;
const STALE_AFTER_MS = 5 * 60 * 1000;
const QR_CANVAS_SIZE = 512;

let friends = loadFriends();
// id -> Zeitpunkt der letzten QR-Generierung (für die Altersanzeige)
const generatedAt = new Map();

const grid = document.getElementById('grid');
const emptyHint = document.getElementById('empty');
const formError = document.getElementById('formError');
const codeInput = document.getElementById('codeInput');

function loadFriends() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(f => f && f.code) : [];
  } catch {
    return [];
  }
}

function saveFriends() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

function encodeDblTimestamp(ms) {
  const hex = ms.toString(16);
  let out = '';
  for (const digit of hex) {
    out += TIMESTAMP_ALPHABET[parseInt(digit, 16)];
  }
  return out;
}

function buildQrText(code) {
  return '4,' + code + encodeDblTimestamp(Date.now());
}

// Rendert den QR-Code auf ein Offscreen-Canvas und liefert eine PNG-Data-URL.
// Die Anzeige erfolgt als <img>, damit am Handy "lange druecken -> Bild
// speichern" funktioniert (das Spiel akzeptiert nur Bilder aus der Galerie).
function renderQrDataUrl(text) {
  const qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();

  const modules = qr.getModuleCount();
  const quietZone = 4;
  const total = modules + quietZone * 2;
  const scale = Math.floor(QR_CANVAS_SIZE / total);
  const size = total * scale;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + quietZone) * scale, (row + quietZone) * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

// id -> aktuelle PNG-Data-URL (fuer Teilen/Speichern)
const qrImages = new Map();

function regenerate(friend) {
  const img = grid.querySelector(`[data-id="${friend.id}"] img`);
  if (!img) return;
  const dataUrl = renderQrDataUrl(buildQrText(friend.code));
  img.src = dataUrl;
  qrImages.set(friend.id, dataUrl);
  generatedAt.set(friend.id, Date.now());
  updateAges();
}

function render() {
  grid.innerHTML = '';
  emptyHint.style.display = friends.length ? 'none' : 'block';

  for (const friend of friends) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = friend.id;

    const holder = document.createElement('div');
    holder.className = 'qr-holder';
    holder.title = t('holderTitle');
    const img = document.createElement('img');
    img.alt = t('qrAlt', { code: friend.code });
    holder.appendChild(img);
    holder.addEventListener('click', () => openQrModal(friend));

    const code = document.createElement('div');
    code.className = 'code';
    code.textContent = friend.code;

    const age = document.createElement('div');
    age.className = 'age';

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      makeButton(t('btnNew'), 'secondary', () => regenerate(friend)),
      makeButton(t('btnImage'), 'secondary', () => shareOrSaveCard(friend)),
      makeButton(t('btnCopy'), 'secondary', () => copyCode(friend)),
      makeButton('🗑️', 'danger-ghost', () => deleteFriend(friend)),
    );

    card.append(holder, code, age, actions);
    grid.appendChild(card);

    regenerate(friend);
  }
  updateAges();
}

function makeButton(label, cls, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = cls;
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

function updateAges() {
  const now = Date.now();
  for (const friend of friends) {
    const card = grid.querySelector(`[data-id="${friend.id}"]`);
    if (!card) continue;
    const label = card.querySelector('.age');
    const ts = generatedAt.get(friend.id) || now;
    const seconds = Math.floor((now - ts) / 1000);
    const stale = now - ts > STALE_AFTER_MS;
    label.classList.toggle('stale', stale);
    if (seconds < 60) {
      label.textContent = t('ageSec', { s: seconds });
    } else {
      label.textContent = t('ageMin', { m: Math.floor(seconds / 60) }) + (stale ? t('ageStale') : '');
    }
  }
}

// Live-Validierung: waehrend der ersten Eingabe neutral (nur positives
// Feedback), Fehler erst nach Verlassen des Feldes ("touched") – danach
// live waehrend der Korrektur, bis der Code stimmt.
let codeTouched = false;

function validateCodeInput(showErrors) {
  const value = codeInput.value.trim();
  codeInput.classList.remove('invalid', 'valid');
  if (!value) { formError.textContent = ''; return; }
  const duplicate = friends.some(f => f.code.toLowerCase() === value.toLowerCase());
  if (CODE_PATTERN.test(value) && !duplicate) {
    codeInput.classList.add('valid');
    formError.textContent = '';
  } else if (showErrors) {
    codeInput.classList.add('invalid');
    formError.textContent = duplicate ? t('errDuplicate') : t('errInvalid');
  } else {
    formError.textContent = '';
  }
}

codeInput.addEventListener('blur', () => {
  if (codeInput.value.trim()) codeTouched = true;
  validateCodeInput(codeTouched);
});

codeInput.addEventListener('input', () => validateCodeInput(codeTouched));

function addFriend(code) {
  formError.textContent = '';
  codeInput.classList.remove('invalid', 'valid');

  const cleanCode = code.trim();
  if (!CODE_PATTERN.test(cleanCode)) {
    formError.textContent = t('errInvalid');
    codeInput.classList.add('invalid');
    return false;
  }
  if (friends.some(f => f.code.toLowerCase() === cleanCode.toLowerCase())) {
    formError.textContent = t('errDuplicate');
    codeInput.classList.add('invalid');
    return false;
  }

  friends.push({
    id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    code: cleanCode,
  });
  saveFriends();
  render();
  return true;
}

function deleteFriend(friend) {
  if (!confirm(t('deleteConfirm', { code: friend.code }))) return;
  friends = friends.filter(f => f.id !== friend.id);
  saveFriends();
  render();
}

function copyCode(friend) {
  const done = () => showToast(t('toastCopied'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(friend.code).then(done, () => fallbackCopy(friend.code, done));
  } else {
    fallbackCopy(friend.code, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch { /* Kopieren nicht möglich */ }
  ta.remove();
}

function dataUrlToBlob(dataUrl) {
  const [head, base64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function qrFile(friend) {
  const dataUrl = qrImages.get(friend.id) || renderQrDataUrl(buildQrText(friend.code));
  const name = `dbl-qr_${friend.code}.png`;
  return new File([dataUrlToBlob(dataUrl)], name, { type: 'image/png' });
}

// Am Handy: natives Teilen-Menue oeffnen ("Bild speichern" legt das PNG in
// die Galerie ab – nur von dort kann das Spiel Bilder laden). Am Desktop
// oder ohne Share-API: normaler PNG-Download.
async function shareFiles(files, title) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ files, title });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return true; // Nutzer hat abgebrochen
      // Share fehlgeschlagen -> Download-Fallback
    }
  }
  return false;
}

function downloadFile(file) {
  const link = document.createElement('a');
  link.download = file.name;
  link.href = URL.createObjectURL(file);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
}

async function shareOrSaveCard(friend) {
  const file = qrFile(friend);
  if (!(await shareFiles([file], `DBL QR – ${friend.code}`))) {
    downloadFile(file);
    showToast(t('toastPng'));
  }
}

function openQrModal(friend) {
  const modal = document.getElementById('qrModal');
  document.getElementById('modalCode').textContent = friend.code;
  // Fuer die Vollbild-Ansicht immer einen frischen Code erzeugen
  document.getElementById('modalImg').src = renderQrDataUrl(buildQrText(friend.code));
  modal.classList.add('open');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// --- Promo-Codes -------------------------------------------------------

let promoData = null;
const PROMO_OPEN_KEY = 'dbl-promo-open';

// Macht ein Panel zum Accordion: Klick auf die Kopfzeile klappt um,
// im eingeklappten Zustand ist das GESAMTE Panel Klickflaeche.
function setupAccordion(panelId, bodyId, toggleId, storageKey) {
  const panel = document.getElementById(panelId);
  const body = document.getElementById(bodyId);
  const toggle = document.getElementById(toggleId);
  const apply = (open) => {
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('collapsed', !open);
    localStorage.setItem(storageKey, open ? '1' : '0');
  };
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) return; // Links (z. B. Quelle) normal folgen
    if (event.target.closest('.promo-toggle') || body.hidden) apply(body.hidden);
  });
  apply(localStorage.getItem(storageKey) === '1');
}

function renderPromos() {
  const panel = document.getElementById('promoPanel');
  const list = document.getElementById('promoList');
  if (!promoData || !Array.isArray(promoData.codes)) return;

  const today = new Date();
  const active = promoData.codes.filter(c =>
    c.code && (!c.expires || new Date(c.expires + 'T23:59:59') >= today));
  if (!active.length) { panel.hidden = true; return; }

  list.innerHTML = '';
  for (const promo of active) {
    const row = document.createElement('div');
    row.className = 'promo-row';

    const btn = document.createElement('button');
    btn.className = 'promo-code';
    btn.type = 'button';
    btn.textContent = promo.code;
    btn.addEventListener('click', () => {
      const done = () => showToast(t('toastPromoCopied'));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(promo.code).then(done, () => fallbackCopy(promo.code, done));
      } else {
        fallbackCopy(promo.code, done);
      }
    });
    row.appendChild(btn);

    if (promo.new) {
      const badge = document.createElement('span');
      badge.className = 'promo-new';
      badge.textContent = 'NEW';
      row.appendChild(badge);
    }

    const reward = document.createElement('span');
    reward.className = 'promo-reward';
    reward.textContent = promo.reward || '';
    row.appendChild(reward);

    if (promo.expires) {
      const exp = document.createElement('span');
      exp.className = 'promo-expires';
      const date = new Intl.DateTimeFormat(currentLang, { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(promo.expires + 'T12:00:00'));
      exp.textContent = t('promoExpires', { date });
      row.appendChild(exp);
    }
    list.appendChild(row);
  }

  const link = document.getElementById('promoSourceLink');
  link.href = promoData.source || '#';
  try { link.textContent = new URL(promoData.source).hostname.replace('www.', ''); } catch { link.textContent = ''; }
  document.getElementById('promoCount').textContent = active.length;
  panel.hidden = false;
}

async function loadPromoCodes() {
  if (window.__PROMO_DATA) { promoData = window.__PROMO_DATA; renderPromos(); return; }
  try {
    const res = await fetch('/promo-codes.json', { cache: 'no-cache' });
    if (!res.ok) return;
    promoData = await res.json();
    renderPromos();
  } catch { /* offline ohne Cache – Panel bleibt ausgeblendet */ }
}

// --- Liste per Link teilen ---------------------------------------------

const SHARE_BASE = 'https://dblqr.org/';

async function shareList() {
  if (!friends.length) return;
  const url = SHARE_BASE + '#codes=' + friends.map(f => f.code).join(',');
  if (navigator.share) {
    try {
      await navigator.share({ title: 'DBL QR Generator', url });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Teilen fehlgeschlagen -> Link kopieren
    }
  }
  const done = () => showToast(t('toastLinkCopied'));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done));
  } else {
    fallbackCopy(url, done);
  }
}

// Beim Oeffnen eines geteilten Links (#codes=...) die Codes nach
// Bestaetigung uebernehmen; der Hash wird danach aus der URL entfernt.
function importFromHash() {
  const match = location.hash.match(/codes=([a-zA-Z0-9,%-]+)/);
  if (!match) return;
  history.replaceState(null, '', location.pathname + location.search);
  const codes = decodeURIComponent(match[1]).split(',')
    .map(c => c.trim())
    .filter(c => CODE_PATTERN.test(c));
  if (!codes.length) return;
  const fresh = codes.filter(c => !friends.some(f => f.code.toLowerCase() === c.toLowerCase()));
  if (!fresh.length) { showToast(t('linkNoNew')); return; }
  if (!confirm(t('importConfirm', { n: fresh.length }))) return;
  for (const code of fresh) {
    friends.push({
      id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      code,
    });
  }
  saveFriends();
  render();
  showToast(t('toastImported', { n: fresh.length }));
}

// --- Events -----------------------------------------------------------

document.getElementById('addForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (addFriend(codeInput.value)) {
    codeInput.value = '';
    codeTouched = false;
    codeInput.classList.remove('invalid', 'valid');
    codeInput.focus();
  }
});

document.getElementById('shareBtn').addEventListener('click', shareList);

document.getElementById('refreshAll').addEventListener('click', () => {
  friends.forEach(regenerate);
  if (friends.length) showToast(t('toastRefreshed'));
});

document.getElementById('downloadAll').addEventListener('click', async () => {
  if (!friends.length) return;
  const files = friends.map(qrFile);
  if (!(await shareFiles(files, 'DBL QR-Codes'))) {
    files.forEach((file, index) => setTimeout(() => downloadFile(file), index * 300));
    showToast(t('toastPngs', { n: files.length }));
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify(friends.map(({ code }) => ({ code })), null, 2)],
    { type: 'application/json' },
  );
  const link = document.createElement('a');
  link.download = 'dbl-freunde.json';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    const entries = JSON.parse(await file.text());
    if (!Array.isArray(entries)) throw new Error('kein Array');
    let added = 0;
    for (const entry of entries) {
      const code = String((entry && entry.code) || entry || '').trim();
      if (!CODE_PATTERN.test(code)) continue;
      if (friends.some(f => f.code.toLowerCase() === code.toLowerCase())) continue;
      friends.push({
        id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        code,
      });
      added++;
    }
    saveFriends();
    render();
    showToast(t('toastImported', { n: added }));
  } catch {
    formError.textContent = t('importError');
  }
});

// Beide Accordions: Kopfzeile klappt um, eingeklappt ist das ganze Panel Klickflaeche
setupAccordion('promoPanel', 'promoBody', 'promoToggle', PROMO_OPEN_KEY);
setupAccordion('howtoPanel', 'howtoBody', 'howtoToggle', 'dbl-howto-open');
setupAccordion('faqPanel', 'faqBody', 'faqToggle', 'dbl-faq-open');

document.getElementById('qrModal').addEventListener('click', () => {
  document.getElementById('qrModal').classList.remove('open');
});

// Beim Zurueckkehren in die App (z. B. am naechsten Tag) alle QR-Codes
// automatisch mit frischem Timestamp neu generieren.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !friends.length) return;
  const oldest = Math.min(...friends.map(f => generatedAt.get(f.id) || 0));
  if (Date.now() - oldest > 30 * 1000) {
    friends.forEach(regenerate);
    showToast(t('toastAuto'));
  }
});

// PWA-Installation: nativer Install-Prompt (Android/Chrome); auf iOS bleibt
// der "Zum Startbildschirm"-Hinweis sichtbar. In der installierten App
// verschwindet beides.
const installBtn = document.getElementById('installBtn');
const installHintEl = document.getElementById('installHint');
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (isStandalone) installHintEl.hidden = true;

let installPromptEvent = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPromptEvent = event;
  if (!isStandalone) {
    installBtn.hidden = false;
    installHintEl.hidden = true;
  }
});

installBtn.addEventListener('click', async () => {
  if (!installPromptEvent) return;
  installPromptEvent.prompt();
  const { outcome } = await installPromptEvent.userChoice;
  if (outcome === 'accepted') installBtn.hidden = true;
  installPromptEvent = null;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  installHintEl.hidden = true;
  showToast(t('toastInstalled'));
});

// PWA: Service Worker fuer Offline-Betrieb (nur ueber http/https moeglich)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
    /* Offline-Cache nicht verfuegbar – App funktioniert trotzdem */
  });
}

document.getElementById('langSelect').addEventListener('change', (event) => {
  navigateToLang(event.target.value);
});

applyStaticTranslations();
setInterval(updateAges, 1000);
render();
importFromHash();
loadPromoCodes();
