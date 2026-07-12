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
const nameInput = document.getElementById('nameInput');
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

function drawQr(canvas, text) {
  const qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();

  const modules = qr.getModuleCount();
  const quietZone = 4;
  const total = modules + quietZone * 2;
  const scale = Math.floor(QR_CANVAS_SIZE / total);
  const size = total * scale;

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
}

function regenerate(friend) {
  const canvas = grid.querySelector(`[data-id="${friend.id}"] canvas`);
  if (!canvas) return;
  drawQr(canvas, buildQrText(friend.code));
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
    const canvas = document.createElement('canvas');
    holder.appendChild(canvas);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = friend.name || 'Ohne Namen';

    const code = document.createElement('div');
    code.className = 'code';
    code.textContent = friend.code;

    const age = document.createElement('div');
    age.className = 'age';

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      makeButton('🔄 Neu', 'secondary', () => regenerate(friend)),
      makeButton('⬇️ PNG', 'secondary', () => downloadCard(friend)),
      makeButton('📋 Code', 'secondary', () => copyCode(friend)),
      makeButton('✏️', 'ghost', () => renameFriend(friend)),
      makeButton('🗑️', 'danger-ghost', () => deleteFriend(friend)),
    );

    card.append(holder, name, code, age, actions);
    grid.appendChild(card);

    drawQr(canvas, buildQrText(friend.code));
    generatedAt.set(friend.id, Date.now());
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
      label.textContent = `generiert vor ${seconds} s`;
    } else {
      label.textContent = `generiert vor ${Math.floor(seconds / 60)} min` + (stale ? ' – neu generieren!' : '');
    }
  }
}

function addFriend(name, code) {
  formError.textContent = '';
  codeInput.classList.remove('invalid');

  const cleanCode = code.trim();
  if (!CODE_PATTERN.test(cleanCode)) {
    formError.textContent = 'Der Friend Code muss 8–10 Zeichen lang sein und darf nur Buchstaben und Zahlen enthalten.';
    codeInput.classList.add('invalid');
    return false;
  }
  if (friends.some(f => f.code.toLowerCase() === cleanCode.toLowerCase())) {
    formError.textContent = 'Dieser Friend Code ist bereits in deiner Liste.';
    codeInput.classList.add('invalid');
    return false;
  }

  friends.push({
    id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    code: cleanCode,
  });
  saveFriends();
  render();
  return true;
}

function deleteFriend(friend) {
  if (!confirm(`„${friend.name || friend.code}“ wirklich löschen?`)) return;
  friends = friends.filter(f => f.id !== friend.id);
  saveFriends();
  render();
}

function renameFriend(friend) {
  const newName = prompt('Neuer Name:', friend.name || '');
  if (newName === null) return;
  friend.name = newName.trim();
  saveFriends();
  render();
}

function copyCode(friend) {
  const done = () => showToast('Friend Code kopiert!');
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

function safeFileName(str) {
  return (str || 'unbenannt').replace(/[^\w.-]+/g, '_').slice(0, 40);
}

function downloadCard(friend) {
  const canvas = grid.querySelector(`[data-id="${friend.id}"] canvas`);
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `dbl-qr_${safeFileName(friend.name)}_${friend.code}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

// --- Events -----------------------------------------------------------

document.getElementById('addForm').addEventListener('submit', (event) => {
  event.preventDefault();
  if (addFriend(nameInput.value, codeInput.value)) {
    nameInput.value = '';
    codeInput.value = '';
    nameInput.focus();
  }
});

document.getElementById('refreshAll').addEventListener('click', () => {
  friends.forEach(regenerate);
  if (friends.length) showToast('Alle QR-Codes neu generiert!');
});

document.getElementById('downloadAll').addEventListener('click', () => {
  friends.forEach((friend, index) => {
    setTimeout(() => downloadCard(friend), index * 300);
  });
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob(
    [JSON.stringify(friends.map(({ name, code }) => ({ name, code })), null, 2)],
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
      const code = String(entry.code || '').trim();
      if (!CODE_PATTERN.test(code)) continue;
      if (friends.some(f => f.code.toLowerCase() === code.toLowerCase())) continue;
      friends.push({
        id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        name: String(entry.name || '').trim(),
        code,
      });
      added++;
    }
    saveFriends();
    render();
    showToast(`${added} Freund(e) importiert`);
  } catch {
    formError.textContent = 'Die Datei konnte nicht gelesen werden (erwartet: JSON-Export dieser App).';
  }
});

setInterval(updateAges, 1000);
render();
