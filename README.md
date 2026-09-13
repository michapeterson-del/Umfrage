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

## Deployment auf Vercel

Die App ist für Vercel vorbereitet: Umfragen, Fragen und anonyme Antworten werden in **Postgres**
gespeichert (nicht in einer lokalen Datei), damit es mit Vercels serverlosen Functions
funktioniert.

1. Repository in ein neues Vercel-Projekt importieren (GitHub-Verbindung).
2. Im Projekt unter **Storage** eine **Postgres**-Datenbank hinzufügen (Vercel Postgres, powered
   by Neon) und mit dem Projekt verknüpfen — dadurch wird `POSTGRES_URL` automatisch als
   Umgebungsvariable gesetzt. Die Tabellen werden beim ersten Aufruf automatisch angelegt.
3. Unter **Settings → Environment Variables** zusätzlich `ANTHROPIC_API_KEY` eintragen (aus der
   [Anthropic Console](https://console.anthropic.com/)), damit die KI-Erstellung aktiv ist.
4. Deployen. Fertig — die App läuft unter deiner `*.vercel.app`-Domain (oder einer eigenen Domain).

Jede andere Postgres-Datenbank funktioniert ebenso — einfach `POSTGRES_URL` (oder `DATABASE_URL`)
auf die entsprechende Verbindungs-URL setzen.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env
# .env: POSTGRES_URL auf eine (lokale oder gehostete) Postgres-Datenbank setzen
# .env: ANTHROPIC_API_KEY=sk-ant-... eintragen, damit die KI-Erstellung aktiv ist
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

Ohne `ANTHROPIC_API_KEY` funktioniert die App weiterhin — die Umfrage wird dann mit einer
einfachen Heuristik statt KI aus deinem Text erzeugt (du kannst sie danach trotzdem frei bearbeiten).
Ohne `POSTGRES_URL` startet die App zwar, aber jede Anfrage, die die Datenbank braucht, schlägt
mit einer klaren Fehlermeldung fehl.

## Tech-Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Postgres](https://www.postgresql.org/) (z. B. Vercel Postgres / Neon) über [`pg`](https://node-postgres.com/)
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) für die KI-gestützte Umfrage-Erstellung
- [exceljs](https://github.com/exceljs/exceljs) für den Excel-Export
- [pdfkit](https://pdfkit.org/) für den PDF-Export
