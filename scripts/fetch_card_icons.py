#!/usr/bin/env python3
"""
Lädt die Karten-Icons aller Charaktere nach assets/card_icons/. Die Icon-Liste
kommt aus data/dblegends_full.json (Scrape) oder – falls der Dump fehlt – aus
src/teams/characters.json, sodass das Script auf jedem frischen Clone läuft.
Bereits vorhandene Dateien werden übersprungen, danach zeigt der Team-Builder
die Bilder selbst gehostet an (npm run build nicht vergessen).

Selbst gehostete Icons sind auch Voraussetzung für den Screenshot-Scan im
Team-Builder: Der Pixel-Abgleich braucht CORS-lesbare Bilder, was bei den
gehotlinkten Icons von dblegends.net nicht garantiert ist.

Verwendung:
  python3 scripts/fetch_card_icons.py [--workers 10]

Auf einem Rechner ausführen, der dblegends.net erreichen kann.
"""

import argparse
import concurrent.futures
import json
import os
import sys
import time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (compatible; dblegends-scraper)"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "card_icons")
DATA = os.path.join(ROOT, "data", "dblegends_full.json")
ROSTER = os.path.join(ROOT, "src", "teams", "characters.json")
ICON_BASE = "https://dblegends.net/assets/card_icons/"


def fetch(url: str, dest: str) -> bool:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        blob = r.read()
    with open(dest, "wb") as fh:
        fh.write(blob)
    return True


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--workers", type=int, default=10)
    args = p.parse_args()

    if os.path.exists(DATA):
        with open(DATA, encoding="utf-8") as fh:
            chars = json.load(fh)["characters"]
        urls = [c["image"] for c in chars if c.get("image")]
    else:
        print(f"{DATA} fehlt – nutze Icon-Liste aus {ROSTER}")
        with open(ROSTER, encoding="utf-8") as fh:
            chars = json.load(fh)["characters"]
        urls = [ICON_BASE + c["icon"] for c in chars if c.get("icon")]
    os.makedirs(OUT_DIR, exist_ok=True)

    jobs = []
    for url in urls:
        dest = os.path.join(OUT_DIR, url.split("/")[-1])
        if not os.path.exists(dest) or os.path.getsize(dest) == 0:
            jobs.append((url, dest))

    print(f"{len(jobs)} von {len(chars)} Icons fehlen noch")
    errors = []
    t0 = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(fetch, url, dest): url for url, dest in jobs}
        for i, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            try:
                fut.result()
            except Exception as e:  # noqa: BLE001
                errors.append((futures[fut], repr(e)))
            if i % 100 == 0:
                print(f"  {i}/{len(jobs)} ({time.time() - t0:.0f}s)")

    print(f"Fertig: {len(jobs) - len(errors)} geladen, {len(errors)} Fehler")
    if errors:
        print(f"Beispiele: {errors[:3]}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
