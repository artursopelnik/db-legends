# DB Legends QR Generator – Anniversary 2026

Ein Fan-Tool für **Dragon Ball Legends**: Speichere beliebig viele Friend Codes
und erzeuge **alle QR-Codes gleichzeitig** – direkt im Spiel einscannbar
(Shenron/Porunga-Event).

Im Gegensatz zu anderen Generatoren, die immer nur einen Code auf einmal
verarbeiten, zeigt diese App die komplette Freundesliste als QR-Grid an –
jeder Code mit eigenem, frischem Timestamp.

## Features

- ➕ Friend Codes anlegen (mit Validierung und Duplikat-Check)
- 🔲 **Alle QR-Codes gleichzeitig** im Grid – kein Umschalten zwischen einzelnen Codes
- 🔄 **„Alle neu generieren“**: jeder QR-Code bekommt einen frischen Timestamp
  (das Spiel akzeptiert nur zeitnah generierte Codes; die Altersanzeige warnt bei alten Codes)
- ⬇️ QR-Codes einzeln oder alle zusammen als **PNG herunterladen**
- 📋 Friend Code in die Zwischenablage kopieren
- 💾 Liste bleibt dauerhaft gespeichert (localStorage), plus **JSON-Export/-Import**
- 📱 **PWA**: als App auf dem Home-Bildschirm installierbar, funktioniert **offline**
  (Service Worker) – am nächsten Tag einfach öffnen, alle Codes sind automatisch frisch
- 🔍 Tipp auf einen QR-Code öffnet ihn im **Vollbild** – ideal, wenn ein Freund
  deinen Code vom Handy abscannt
- ♻️ Beim Zurückkehren in die App werden alle QR-Codes automatisch neu generiert

## Nutzung

**Als App installieren (empfohlen):** Die App läuft live unter
**https://dblqr.org/** (automatischer Deploy via GitHub Actions
bei jedem Push auf `main`). Am Handy öffnen und als App speichern:
auf dem iPhone (Safari) über das Teilen-Symbol → **„Zum Home-Bildschirm“**,
auf Android (Chrome & viele andere Browser) über das ⋮-Menü →
**„Zum Startbildschirm hinzufügen“** bzw. **„App installieren“**. Danach startet
die App wie eine native App, auch ohne Internet.

Alternativ einfach `index.html` im Browser öffnen – kein Server, kein Build-Schritt nötig
(ohne HTTPS gibt es nur keinen Offline-Modus/Installation, alles andere funktioniert).

Im Spiel: **Menü → Freunde → QR-Code scannen** und die Codes vom Bildschirm abscannen.

## Team-Builder-Roster aktualisieren

Der Team-Builder auf `/teams/` kennt alle Charaktere aus
`src/teams/characters.json`. Statt alle Kämpfer einzeln anzuklicken, kann man
auch einen Screenshot des Spiel-Hauptbildschirms hochladen: Die sechs
Team-Karten werden im Browser erkannt (Kartenerkennung + Bildabgleich gegen
die Roster-Icons, rein clientseitig) und in der richtigen Reihenfolge ins Team
übernommen; jeder Slot lässt sich danach per Dropdown korrigieren. Die Datei wird aus einem Scrape von
de.dblegends.net generiert. So bringst du sie auf den neuesten Stand:

1. `python3 scripts/scrape_dblegends.py` – lädt alle Charakter- und
   Equipment-Seiten der englischen Seite (dblegends.net) und schreibt
   `data/dblegends_full.json` sowie `data/dblegends_equipment.json`
   (auf einem Rechner ausführen, der dblegends.net erreichen kann;
   braucht nur die Python-Standardbibliothek).
2. `npm run update-roster` – konvertiert beide Scrapes, generiert Roster und
   Equip-Empfehlungen und baut alle Seiten neu.

Manuelle Ausnahmen für Einheiten, die dem Scrape fehlen, kommen nach
`src/teams/data/roster-extra.json`.

## Technik

Der QR-Inhalt entspricht dem Format des DB-Legends-Freundes-Scanners:

```
4,<friendCode><timestamp>
```

Der Timestamp ist `Date.now()` als Hex-String, wobei jede Hex-Ziffer auf das
Alphabet `B C D E F G H J K M N P Q R S T` gemappt wird (Format dokumentiert
durch die Open-Source-Implementierung von
[LeCitronVert](https://github.com/LeCitronVert/dbl-anniversary-qr-2023)).

QR-Erzeugung: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator)
(MIT, Kazuhiko Arase), gebündelt in `lib/qrcode.js`. Fehlerkorrektur-Level H,
wie vom Spiel-Scanner erwartet.

Alles läuft rein clientseitig – es werden keine Daten an einen Server gesendet.

## Lizenz

© 2026 Artur Sopelnik – **Alle Rechte vorbehalten.** Der Code dieses Projekts darf ohne
ausdrückliche Erlaubnis nicht kopiert, verändert oder weiterveröffentlicht werden.
Ausgenommen sind die gebündelten Fremdbibliotheken, die unter ihren eigenen Lizenzen stehen:
[qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT) und die
Schriftart Bangers (SIL OFL 1.1, siehe `fonts/bangers-LICENSE`).

## Hinweis

Inoffizielles Fan-Projekt, nicht mit Bandai Namco verbunden.
