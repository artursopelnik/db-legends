#!/usr/bin/env python3
"""
Scraper für https://de.dblegends.net
Erzeugt zwei JSON-Dateien mit allen Dragon Ball Legends Charakteren:

  data/dblegends_characters.json  – kompakter Index (Name, Element, Rarity, Tags, Bild)
  data/dblegends_full.json        – volle Details (Lv-5000-Stats, Fähigkeiten, Arts,
                                    Transformationen, Zenkai-Boosts)

Verwendung:
  python3 scrape_dblegends.py [--out data] [--workers 10] [--cache .cache/dbl]

Benötigt nur die Python-Standardbibliothek (kein pip install nötig).
"""

import argparse
import concurrent.futures
import json
import os
import re
import sys
import time
import urllib.request
from datetime import date

BASE = "https://de.dblegends.net"
UA = {"User-Agent": "Mozilla/5.0 (compatible; dblegends-scraper)"}


# ---------------------------------------------------------------- HTTP helpers

def http_get(url: str, tries: int = 3, timeout: int = 30) -> bytes:
    last_err = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1 + attempt)
    raise RuntimeError(f"GET {url} fehlgeschlagen: {last_err}")


# ---------------------------------------------------------------- Listenseite

def parse_character_list(html: str) -> tuple[list[dict], dict[int, str]]:
    """Extrahiert alle Charakter-Kacheln + Tag-Namen aus /characters."""
    chars = []
    blocks = re.split(r'(?=<a href="character/\d+")', html)
    for b in blocks:
        m = re.match(r'<a href="character/(\d+)"', b)
        if not m:
            continue

        def attr(name: str):
            mm = re.search(rf'data-{name}="([^"]*)"', b)
            return mm.group(1) if mm else None

        title = re.search(r'<div title="([^"]*)"', b)
        img = re.search(r'<img[^>]*src="([^"]*)"', b)
        tags = attr("tags") or ""
        chars.append({
            "id": int(m.group(1)),
            "name": attr("charaname"),
            "card_id": title.group(1) if title else None,
            "element": attr("element"),
            "rarity": attr("rarity"),
            "zenkai": attr("zenkai") == "1",
            "legends_limited": attr("lf") == "1",
            "tags": [int(t) for t in tags.split()],
            "image": (BASE + img.group(1)) if img else None,
            "url": f"{BASE}/character/{m.group(1)}",
        })

    tagmap = {
        int(val): name.strip()
        for val, name in re.findall(r'<option value="(\d+)"[^>]*>([^<]+)</option>', html)
    }
    for c in chars:
        c["tag_names"] = [tagmap[t] for t in c["tags"] if t in tagmap]
    return sorted(chars, key=lambda c: c["id"]), tagmap


# ---------------------------------------------------------------- Detailseiten

def extract_json_blocks(html: str) -> dict:
    """Liest die eingebetteten <script type="application/json">-Blöcke."""
    out = {}
    for m in re.finditer(
        r'<script id="(\w+)"\s+type="application/json">(.*?)</script>', html, re.S
    ):
        try:
            out[m.group(1)] = json.loads(m.group(2))
        except json.JSONDecodeError:
            pass
    return out


def resolve_ability(ab_map: dict, aid) -> dict | None:
    if aid is None or aid == -1:
        return None
    e = ab_map.get(str(aid))
    if not e or (not e[0] and not e[1]):
        return None
    return {"name": e[0], "description": e[1]}


def resolve_arts(am_map: dict, ids) -> list[dict]:
    arts = []
    for aid in ids or []:
        if aid == -1:
            continue
        e = am_map.get(str(aid))
        if e:
            arts.append({
                "id": aid,
                "name": e[0],
                "description": e[1],
                "ki_cost_levels": e[5] if len(e) > 5 else None,
            })
    return arts


def ac_lookup(ac, key):
    if isinstance(ac, dict):
        return ac.get(str(key))
    if isinstance(ac, list) and isinstance(key, int) and 0 <= key < len(ac):
        return ac[key]
    return None


def parse_detail(f: dict, AB: dict, AM: dict, AC) -> dict:
    ab = f.get("ab", {})
    av = f.get("av", {})

    def lst(ids):
        return [x for x in (resolve_ability(AB, i) for i in (ids or [])) if x]

    # Unique Abilities sind pro Form-Slot gruppiert (u = [slot, ?, ability_id, ?])
    uniq_by_form: dict[int, list] = {}
    for u in ab.get("u", []):
        slot = u[0] if len(u) > 0 else 0
        r = resolve_ability(AB, u[2] if len(u) > 2 else -1)
        if r:
            uniq_by_form.setdefault(slot, []).append(r)

    arts_cards = [
        {"name": c[0], "description": c[1]}
        for idx in f.get("ac", [])
        if (c := ac_lookup(AC, idx))
    ]

    transformations = []
    for tf in f.get("forms", []):
        transformations.append({
            "slot": tf.get("f"),
            "name": tf.get("n"),
            "image": f"{BASE}/assets/card_icons/BChaIco_{tf.get('img')}.webp"
                     if tf.get("img") else None,
            "transform_ability": resolve_ability(AB, tf.get("ma")),
            "stat_modifiers_percent": {k: v / 100 for k, v in (tf.get("m") or {}).items()},
            "arts_overrides": resolve_arts(AM, tf.get("av")),
            "unique_abilities": uniq_by_form.get(tf.get("f"), []),
        })

    return {
        "card_id": f.get("card"),
        "rarity": f.get("rarity"),
        "legends_limited": bool(f.get("ll")),
        "element": f.get("el"),
        "image": f"{BASE}/assets/card_icons/BChaIco_{f.get('img')}.webp"
                 if f.get("img") else None,
        "stats": {
            "level_min": f.get("min"),
            "level_5000": f.get("max"),
            "zenkai_soul_boost": f.get("soul"),
            "base": {
                "strike_atk_rate": f.get("slr"),
                "shot_atk_rate": f.get("str"),
                "strike_def_rate": f.get("shr"),
                "shot_def_rate": f.get("exr"),
                "ki_restore": f.get("ki"),
                "critical": f.get("lk"),
                "vanish_gauge": f.get("vn"),
                "combo_dmg": f.get("ccd"),
            },
            "arts_cards_held": f.get("ar"),
        },
        "main_ability": resolve_ability(AB, ab.get("m")),
        "unique_abilities": uniq_by_form.get(0, []),
        "z_abilities": lst(ab.get("z")),
        "zenkai_abilities": lst(ab.get("p")),
        "ll_zenkai_z_abilities": lst(ab.get("llz")),
        "legend_ability": resolve_ability(AB, ab.get("legend")),
        "ultra_ability": resolve_ability(AB, ab.get("xm"))
                         if isinstance(ab.get("xm"), int) else None,
        "arts": resolve_arts(AM, av.get("b")),
        "special_arts_cards": arts_cards,
        "transformations": transformations,
    }




# ---------------------------------------------------------------- Equipment

def parse_equipment_list(html: str) -> dict[int, dict]:
    """Extrahiert alle Equipment-Kacheln aus /equipment."""
    out = {}
    for m in re.finditer(
        r'<a href="/equip/(\d+)" class="eqx-card"\s+([^>]+)>(.*?)</a>', html, re.S
    ):
        eid = int(m.group(1))
        attrs = dict(re.findall(r'data-(\w+)="([^"]*)"', m.group(2)))
        img = re.search(r'src="([^"]+)"', m.group(3))
        frame = re.search(r'eqx-frame (\w+)', m.group(3))
        out[eid] = {"attrs": attrs, "img": img.group(1) if img else None,
                    "frame": frame.group(1) if frame else None}
    return out


def _clean(s: str) -> str:
    import html as _h
    return _h.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def parse_equipment_detail(eid: int, page: str, ld: dict, tagmap: dict) -> dict:
    name = re.search(r'class="eqd-name">(.*?)</div>', page, re.S)
    detail = re.search(r'class="eqd-detail">(.*?)</div>', page, re.S)

    conditions = []
    cond_sec = re.search(r'class="eqd-cond"(.*?)(<!-- ── Slots|class="eqd-slot)', page, re.S)
    if cond_sec:
        for grp in re.findall(r'class="eqd-condgrp">(.*?)</div>', cond_sec.group(1), re.S):
            badges = [_clean(b) for b in
                      re.findall(r'class="eqd-badge[^"]*">(.*?)</span>', grp, re.S)]
            if badges:
                conditions.append(badges)  # Badges innerhalb einer Gruppe: AND

    slots = []
    for sm in re.finditer(
        r'class="eqd-slot">\s*<div class="eqd-slot-label">([^<]+)</div>(.*?)</div>\s*'
        r'(?=<div class="eqd-slot">|<!--|<div class="eqd-rank|$)', page, re.S
    ):
        opts = [_clean(o) for o in re.findall(r'class="eqd-eff">(.*?)</div>', sm.group(2), re.S)]
        slots.append({"slot": _clean(sm.group(1)), "options": opts})

    eqc = re.search(r'EQUIPPABLE CHARACTERS(.*?)(<footer|DBLegends\.net)', page, re.S)
    seg = eqc.group(1) if eqc else ""
    char_ids = sorted(set(int(x) for x in re.findall(r'href="character/(\d+)"', seg)))
    any_char = "any character" in seg

    attrs = ld["attrs"]
    cond_tag_ids = [int(v) for k, v in attrs.items()
                    if k.startswith("element") and v.isdigit()]
    return {
        "id": eid,
        "name": _clean(name.group(1)) if name else attrs.get("name"),
        "url": f"{BASE}/equip/{eid}",
        "image": (BASE + "/" + ld["img"].lstrip("/")) if ld.get("img") else None,
        "rarity": int(attrs.get("rarity", 0)),
        "frame": ld.get("frame"),
        "type": _clean(detail.group(1)).split("\n")[0] if detail else None,
        "condition_tag_ids": cond_tag_ids,
        "condition_tags": [tagmap[t] for t in cond_tag_ids if t in tagmap],
        "conditions": conditions,
        "equippable": "any" if any_char else char_ids,
        "slots": slots,
    }


def scrape_equipment(out_dir: str, cache_dir: str, workers: int, tagmap: dict) -> None:
    print("Lade Equipment-Liste …")
    list_html = http_get(f"{BASE}/equipment").decode("utf-8")
    list_data = parse_equipment_list(list_html)
    print(f"  {len(list_data)} Equips gefunden")

    eq_cache = os.path.join(cache_dir, "equip") if cache_dir else None
    if eq_cache:
        os.makedirs(eq_cache, exist_ok=True)

    def fetch(eid: int) -> tuple[int, str]:
        cache_file = os.path.join(eq_cache, f"{eid}.html") if eq_cache else None
        if cache_file and os.path.exists(cache_file) and os.path.getsize(cache_file) > 20_000:
            return eid, open(cache_file, encoding="utf-8").read()
        page = http_get(f"{BASE}/equip/{eid}").decode("utf-8")
        if cache_file:
            with open(cache_file, "w", encoding="utf-8") as fh:
                fh.write(page)
        return eid, page

    print(f"Lade {len(list_data)} Equip-Detailseiten ({workers} parallel) …")
    t0 = time.time()
    equips, errors = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(fetch, eid): eid for eid in sorted(list_data)}
        for i, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            eid = futures[fut]
            try:
                _, page = fut.result()
                equips.append(parse_equipment_detail(eid, page, list_data[eid], tagmap))
            except Exception as e:  # noqa: BLE001
                errors.append((eid, repr(e)))
            if i % 200 == 0:
                print(f"  {i}/{len(list_data)} ({time.time() - t0:.0f}s)")

    equips.sort(key=lambda e: e["id"])
    path = os.path.join(out_dir, "dblegends_equipment.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({
            "source": f"{BASE}/equipment",
            "generated": date.today().isoformat(),
            "count": len(equips),
            "equipment": equips,
        }, fh, ensure_ascii=False, indent=1)
    print(f"  -> {path}  ({os.path.getsize(path) / 1e6:.1f} MB)")
    if errors:
        print(f"WARNUNG: {len(errors)} Equip-Fehler: {errors[:5]}", file=sys.stderr)


# ---------------------------------------------------------------- Main

def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out", default="data", help="Ausgabeordner (Default: data)")
    p.add_argument("--workers", type=int, default=10, help="Parallele Downloads")
    p.add_argument("--cache", default=".cache/dbl",
                   help="Cache-Ordner für HTML-Seiten ('' = kein Cache)")
    p.add_argument("--skip-equipment", action="store_true",
                   help="Equipment-Scrape überspringen")
    args = p.parse_args()

    os.makedirs(args.out, exist_ok=True)
    if args.cache:
        os.makedirs(args.cache, exist_ok=True)

    # 1) Listenseite
    print("Lade Charakterliste …")
    list_html = http_get(f"{BASE}/characters").decode("utf-8")
    chars, tagmap = parse_character_list(list_html)
    print(f"  {len(chars)} Charaktere gefunden")

    index_path = os.path.join(args.out, "dblegends_characters.json")
    with open(index_path, "w", encoding="utf-8") as fh:
        json.dump({
            "source": f"{BASE}/characters",
            "generated": date.today().isoformat(),
            "count": len(chars),
            "tag_map": {str(k): v for k, v in sorted(tagmap.items())},
            "characters": chars,
        }, fh, ensure_ascii=False, indent=1)
    print(f"  -> {index_path}")

    # 2) Detailseiten parallel laden
    def fetch_detail(cid: int) -> tuple[int, str]:
        cache_file = os.path.join(args.cache, f"{cid}.html") if args.cache else None
        if cache_file and os.path.exists(cache_file) and os.path.getsize(cache_file) > 50_000:
            return cid, open(cache_file, encoding="utf-8").read()
        html = http_get(f"{BASE}/character/{cid}").decode("utf-8")
        if cache_file:
            with open(cache_file, "w", encoding="utf-8") as fh:
                fh.write(html)
        return cid, html

    print(f"Lade {len(chars)} Detailseiten ({args.workers} parallel) …")
    t0 = time.time()
    pages: dict[int, str] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = [ex.submit(fetch_detail, c["id"]) for c in chars]
        for i, fut in enumerate(concurrent.futures.as_completed(futures), 1):
            cid, html = fut.result()
            pages[cid] = html
            if i % 100 == 0:
                print(f"  {i}/{len(chars)} ({time.time() - t0:.0f}s)")
    print(f"  fertig in {time.time() - t0:.0f}s")

    # 3) Parsen
    print("Parse Detailseiten …")
    out_chars, errors = [], []
    for c in chars:
        cid = c["id"]
        try:
            b = extract_json_blocks(pages[cid])
            data = b.get("data")
            forms = list(data.values()) if isinstance(data, dict) else data
            tr = b.get("tr", {})
            entry = {
                "id": cid,
                "name": c["name"],
                "url": c["url"],
                "element": c["element"],
                "rarity": c["rarity"],
                "zenkai": c["zenkai"],
                "legends_limited": c["legends_limited"],
                "tags": [v[0] for v in tr.values()] if isinstance(tr, dict) else [],
            }
            entry.update(parse_detail(
                forms[0], b.get("ab", {}), b.get("am", {}), b.get("ac", [])
            ))
            out_chars.append(entry)
        except Exception as e:  # noqa: BLE001
            errors.append((cid, repr(e)))

    full_path = os.path.join(args.out, "dblegends_full.json")
    with open(full_path, "w", encoding="utf-8") as fh:
        json.dump({
            "source": BASE,
            "generated": date.today().isoformat(),
            "count": len(out_chars),
            "characters": out_chars,
        }, fh, ensure_ascii=False, indent=1)

    print(f"  -> {full_path}  ({os.path.getsize(full_path) / 1e6:.1f} MB)")

    # 4) Equipment
    if not args.skip_equipment:
        scrape_equipment(args.out, args.cache, args.workers, tagmap)

    if errors:
        print(f"WARNUNG: {len(errors)} Fehler: {errors[:5]}", file=sys.stderr)
        return 1
    print("Fertig, keine Fehler.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
