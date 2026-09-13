# Umfrage KI

Eine Web-App, mit der du Umfragen aus einer kurzen Freitext-Beschreibung erstellst. Die KI
erkennt darin die gewünschten Fragen und macht daraus eine strukturierte Umfrage mit passenden
Fragetypen (Einzelauswahl, Mehrfachauswahl, Bewertungsskala, Freitext). Du bekommst einen
Link zum Teilen — Teilnehmende stimmen anonym ab — und einen privaten Ergebnis-Link mit
Diagrammen sowie Excel- und PDF-Export.

## Funktionsweise

1. **Erstellen**: Auf der Startseite beschreibst du frei, was du wissen möchtest. Ein Klick auf
   „Umfrage mit KI erstellen" ruft die Anthropic API auf und liefert einen Entwurf mit Titel,
   Beschreibung und Fragen, den du direkt im Browser bearbeiten kannst (Fragen hinzufügen/entfernen,
   Typ ändern, Optionen anpassen).
2. **Veröffentlichen**: Nach dem Veröffentlichen erhältst du zwei Links:
   - einen **öffentlichen Umfrage-Link** (`/u/<id>`) zum Teilen, über den anonym abgestimmt wird,
   - einen **privaten Ergebnis-Link** (`/u/<id>/ergebnisse?token=...`), der nur dir die Auswertung zeigt.
3. **Abstimmen**: Teilnehmende beantworten die Fragen ohne Login. Ein zufälliges, anonymes Cookie
   verhindert Mehrfachabstimmungen im selben Browser — es werden keine persönlichen Daten gespeichert.
4. **Auswertung**: Auf der Ergebnisseite siehst du Balkendiagramme pro Frage, den Durchschnitt bei
   Bewertungsfragen und alle Freitextantworten. Über die Buttons lädst du die Ergebnisse als
   **Excel (.xlsx)** oder **PDF** herunter.

## Setup

```bash
npm install
cp .env.example .env
# .env: ANTHROPIC_API_KEY=sk-ant-... eintragen, damit die KI-Erstellung aktiv ist
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

Ohne `ANTHROPIC_API_KEY` funktioniert die App weiterhin — die Umfrage wird dann mit einer
einfachen Heuristik statt KI aus deinem Text erzeugt (du kannst sie danach trotzdem frei bearbeiten).

## Daten & Deployment

- Umfragen, Fragen und anonyme Antworten werden in einer lokalen SQLite-Datenbank unter
  `data/umfrage.db` gespeichert (wird beim ersten Start automatisch angelegt).
- Das eignet sich für Self-Hosting mit `npm run build && npm run start` (ein durchgehend
  laufender Node-Prozess, z. B. auf einem eigenen Server, in Docker oder auf einer VM).
- Für Plattformen mit flüchtigem/serverlosem Dateisystem (z. B. Vercel) müsste die SQLite-Anbindung
  durch eine echte Datenbank (z. B. Postgres) ersetzt werden, da dort keine dauerhafte lokale Datei
  existiert.

## Tech-Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) als eingebettete Datenbank
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) für die KI-gestützte Umfrage-Erstellung
- [exceljs](https://github.com/exceljs/exceljs) für den Excel-Export
- [pdfkit](https://pdfkit.org/) für den PDF-Export
