# DB Legends QR Generator – Anniversary 2026

Ein Fan-Tool für **Dragon Ball Legends**: Speichere beliebig viele Friend Codes
mit Namen und erzeuge **alle QR-Codes gleichzeitig** – direkt im Spiel
einscannbar (Shenron/Porunga-Event).

Im Gegensatz zu anderen Generatoren, die immer nur einen Code auf einmal
verarbeiten, zeigt diese App die komplette Freundesliste als QR-Grid an –
jeder Code mit eigenem, frischem Timestamp.

## Features

- ➕ Freunde mit **Name + Friend Code** anlegen (mit Validierung und Duplikat-Check)
- 🔲 **Alle QR-Codes gleichzeitig** im Grid – kein Umschalten zwischen einzelnen Codes
- 🔄 **„Alle neu generieren“**: jeder QR-Code bekommt einen frischen Timestamp
  (das Spiel akzeptiert nur zeitnah generierte Codes; die Altersanzeige warnt bei alten Codes)
- ⬇️ QR-Codes einzeln oder alle zusammen als **PNG herunterladen**
- 📋 Friend Code in die Zwischenablage kopieren
- 💾 Liste bleibt im Browser gespeichert (localStorage), plus **JSON-Export/-Import**
- 📱 Responsive – funktioniert auch am Handy

## Nutzung

Einfach `index.html` im Browser öffnen – kein Server, kein Build-Schritt nötig.

Alternativ als GitHub Pages hosten: *Settings → Pages → Deploy from branch*
auswählen, dann ist die App unter `https://<user>.github.io/db-legends/` erreichbar.

Im Spiel: **Menü → Freunde → QR-Code scannen** und die Codes vom Bildschirm abscannen.

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

## Hinweis

Inoffizielles Fan-Projekt, nicht mit Bandai Namco verbunden.
