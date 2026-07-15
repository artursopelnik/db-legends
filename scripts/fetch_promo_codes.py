#!/usr/bin/env python3
"""Holt aktuelle Dragon-Ball-Legends-Promo-Codes von GamesRadar und
schreibt sie nach promo-codes.json (nur bei Aenderungen an der Code-Liste).
Aufgenommen werden nur Codes mit explizitem, noch gueltigem Ablaufdatum –
GamesRadar fuehrt abgelaufene Codes (ohne Datum) weiter in der aktiven Liste.

Aufruf ohne Argument: Live-Abruf. Mit Dateipfad: liest lokales HTML (Tests).
Exit-Code ist immer 0, ausser bei unerwarteten Fehlern – ein fehlgeschlagener
Abruf laesst die bestehende Datei unangetastet.
"""

import html as htmllib
import json
import pathlib
import re
import sys
import urllib.request
from datetime import datetime, timezone

URL = 'https://www.gamesradar.com/games/rpg/dragon-ball-legends-codes/'
OUT = pathlib.Path(__file__).resolve().parent.parent / 'promo-codes.json'

# Ein Listeneintrag zaehlt nur als Code, wenn die Belohnung nach Spiel-Loot klingt.
REWARD_KEYWORDS = ['crystal', 'chrono', 'z power', 'energy', 'ticket', 'summon', 'reward', 'medal']

MONTH_FORMATS = ('%B %d %Y', '%b %d %Y')


def parse_expiry(text):
    m = re.search(r'\b(?:expires?|ends|until)\b\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4})', text, re.I)
    if not m:
        return None
    raw = m.group(1).replace(',', '')
    for fmt in MONTH_FORMATS:
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def extract_codes(page_html, today=None):
    """Liefert (codes, kandidaten). kandidaten zaehlt alle als Code erkannten
    Eintraege VOR dem Datumsfilter – 0 bedeutet, dass die Seite gar nicht
    geparst werden konnte (dann bestehende Datei behalten)."""
    today = (today or datetime.now(timezone.utc).date()).isoformat()

    # Alles ab der "Expired codes"-Ueberschrift verwerfen – dort listet
    # GamesRadar die abgelaufenen Codes (oft ohne Datum im Eintrag).
    cut = re.search(r'<h[1-6][^>]*>[^<]*expired', page_html, re.I)
    if cut:
        page_html = page_html[:cut.start()]

    codes = []
    seen = set()
    candidates = 0
    # Codes stehen ueblicherweise in <li>-Eintraegen, gelegentlich in <p>.
    for item in re.findall(r'<(?:li|p)[^>]*>(.*?)</(?:li|p)>', page_html, re.S):
        text = htmllib.unescape(re.sub(r'<[^>]+>', ' ', item))
        text = re.sub(r'\s+', ' ', text).strip()
        m = re.match(r'^([A-Z0-9]{3,20})\s*[–—-]\s*(.+)$', text)
        if not m:
            continue
        code, rest = m.group(1), m.group(2)
        # Sicherheitsnetz: als abgelaufen markierte Eintraege nie aufnehmen
        if re.search(r'expired', rest, re.I):
            continue
        if code in seen or not any(k in rest.lower() for k in REWARD_KEYWORDS):
            continue
        seen.add(code)
        candidates += 1
        # GamesRadar laesst laengst abgelaufene Codes in der "aktiven" Liste
        # stehen – verlaesslich einloesbar sind nur Eintraege mit explizitem,
        # noch nicht verstrichenem Ablaufdatum. Alles andere ueberspringen.
        expires = parse_expiry(rest)
        if not expires or expires < today:
            continue
        reward = re.sub(r'\s*\((?:expires?|ends|until)[^)]*\)\s*', ' ', rest, flags=re.I)
        reward = re.sub(r'\s*new!?\s*$', '', reward, flags=re.I).strip(' –—-')
        codes.append({
            'code': code,
            'reward': reward,
            'expires': expires,
            'new': bool(re.search(r'new!?\s*$', rest, re.I)),
        })
    return codes, candidates


def main():
    if len(sys.argv) > 1:
        page_html = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8', errors='replace')
    else:
        req = urllib.request.Request(URL, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            'Accept-Language': 'en',
        })
        page_html = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')

    codes, candidates = extract_codes(page_html)
    if not candidates:
        print('WARN: no codes found – keeping existing promo-codes.json')
        return
    if not codes:
        print(f'INFO: {candidates} Codes gefunden, aber keiner mit gueltigem Ablaufdatum.')

    old_codes = None
    if OUT.exists():
        try:
            old_codes = json.loads(OUT.read_text(encoding='utf-8')).get('codes')
        except (json.JSONDecodeError, OSError):
            pass
    if codes == old_codes:
        print(f'No changes ({len(codes)} codes).')
        return

    OUT.write_text(json.dumps({
        'updatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'source': URL,
        'codes': codes,
    }, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Updated promo-codes.json with {len(codes)} codes:')
    for c in codes:
        print(f"  {c['code']} – {c['reward']}" + (f" (expires {c['expires']})" if c['expires'] else ''))


if __name__ == '__main__':
    main()
