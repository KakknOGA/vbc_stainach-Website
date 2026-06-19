# VBC Stainach – Website & CMS

Offizielle Website des Volleyballvereins VBC Stainach, inklusive einem selbst entwickelten Admin-CMS-System zur Verwaltung aller Inhalte.

---

## Features

**Öffentliche Website**
- Startseite mit Vereinsstatistiken, Erfolgen, Galerie und Vereinsgeschichte (Zeitleiste)
- Teamseiten mit Spielerlisten
- Neuigkeiten / Newsbereich mit Artikeln und Tags
- Spielplan mit Heim- und Auswärtsspielen
- Sponsorenliste
- Vorstandsseite
- Datenschutz- und Impressumsseite

**Admin-CMS**
- Selbst entwickeltes Content-Management-System unter `/admin`
- Sitzungsbasierter Login mit verschlüsselten Passwörtern (bcrypt)
- Vollständige CRUD-Verwaltung für alle Inhaltsbereiche:
  - Teams & Spieler
  - News (Entwurf / Veröffentlicht)
  - Spielplan
  - Vorstand
  - Galerie
  - Sponsoren
  - Vereinsgeschichte (Zeitleiste)
  - Erfolge & Statistiken
  - Seitentexte (editierbare Textabschnitte pro Seite)
- Medienbibliothek mit Bild-Upload (max. 10 MB, JPEG/PNG/GIF/WebP/SVG)
- Dashboard-Übersicht mit Live-Statistiken
- Passwort-Änderungsfunktion im Dashboard

---

## Technologie

| Bereich | Technologie |
|---|---|
| Backend | Node.js + Express |
| Datenbank | Supabase (PostgreSQL) |
| Authentifizierung | express-session + bcryptjs |
| Datei-Upload | multer |
| Frontend | Vanilla HTML, CSS, JavaScript |

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) v18 oder neuer
- Ein kostenloses [Supabase](https://supabase.com/)-Konto

---

## Installation & Einrichtung

### 1. Repository klonen & Abhängigkeiten installieren

```bash
git clone https://github.com/KakknOGA/vbc_stainach-Website.git
cd vbc_stainach-Website
npm install
```

### 2. Supabase-Projekt erstellen

1. Gehe auf [supabase.com](https://supabase.com/) und erstelle ein neues Projekt.
2. Warte, bis das Projekt bereit ist (ca. 1–2 Minuten).

### 3. Datenbank-Schema einrichten

1. Öffne im Supabase-Dashboard: **SQL Editor**
2. Klicke auf **New query**
3. Kopiere den gesamten Inhalt der Datei `supabase-schema.sql` aus diesem Repository
4. Füge ihn ein und klicke auf **Run**

Alle Tabellen (Teams, Spieler, News, Galerie, etc.) werden automatisch angelegt.

### 4. Umgebungsvariablen konfigurieren

Erstelle eine Datei `.env` im Hauptverzeichnis des Projekts (falls noch nicht vorhanden):

```
# Supabase-Verbindung
# URL ist fix (aus der Projekt-ID generiert)
SUPABASE_URL=https://DEINE-PROJEKT-ID.supabase.co

# Service-Role-Key: Supabase Dashboard → Project Settings → API → service_role (secret)
SUPABASE_SERVICE_KEY=dein-service-role-key-hier

# Session-Geheimnis (beliebige lange, zufällige Zeichenfolge)
SESSION_SECRET=ein-sicheres-geheimnis-hier-eintragen

# Port (optional, Standard: 3000)
PORT=3000
```

**Wo findest du die Supabase-Werte?**

- `SUPABASE_URL`: Supabase Dashboard → **Project Settings** → **Data API** → **Project URL**
- `SUPABASE_SERVICE_KEY`: Supabase Dashboard → **Project Settings** → **API** → **service_role** (geheim halten!)

> **Wichtig:** Die `.env`-Datei enthält sensible Zugangsdaten. Teile sie niemals öffentlich und checke sie nicht in Git ein.

### 5. Server starten

**Entwicklung** (mit automatischem Neustart bei Dateiänderungen):
```bash
npm run dev
```

**Produktion:**
```bash
npm start
```

Der Server ist danach erreichbar unter:
- Website: [http://localhost:3000](http://localhost:3000)
- Admin-CMS: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Admin-Dashboard

Das Admin-Dashboard ist ein selbst entwickeltes CMS-System, das alle Vereinsinhalte über eine grafische Oberfläche verwaltbar macht – ohne direkten Datenbankzugriff.

### Erster Login

Beim ersten Start wird automatisch ein Standard-Administrator angelegt:

| Feld | Wert |
|---|---|
| Benutzername | `admin` |
| Passwort | `admin123` |

**Bitte das Passwort nach dem ersten Login unter "Passwort ändern" im Dashboard ändern!**

### Verwaltbare Bereiche

| Bereich | Beschreibung |
|---|---|
| News | Artikel erstellen, bearbeiten, als Entwurf speichern oder veröffentlichen |
| Teams | Vereinsteams anlegen und bearbeiten |
| Spieler | Spieler einem Team zuordnen, Nummer und Position verwalten |
| Spielplan | Heim- und Auswärtsspiele mit Datum, Uhrzeit und Ort |
| Vorstand | Vorstandsmitglieder mit Rolle und Foto |
| Galerie | Bilder hochladen und in der Galerie anzeigen |
| Sponsoren | Sponsoren mit Logo und Link verwalten |
| Zeitleiste | Vereinsgeschichte chronologisch darstellen |
| Erfolge | Auszeichnungen und Statistiken pflegen |
| Medienbibliothek | Bildverwaltung für alle hochgeladenen Dateien |
| Seitentexte | Editierbare Textabschnitte auf einzelnen Seiten |

---

## Projektstruktur

```
vbc_stainach-Website/
├── admin/              # Admin-Dashboard (HTML, CSS, JS)
├── data/               # Lokale JSON-Fallback-Daten
├── lib/
│   └── supabase.js     # Supabase-Client
├── uploads/            # Hochgeladene Bilder (lokal gespeichert)
├── WebsiteAssets/      # Bilder und Assets für die Website
├── Fonts/              # Schriftarten
├── index.html          # Startseite
├── team.html           # Teamseite
├── news.html           # Newsübersicht
├── neuigkeiten.html    # Newsartikel-Detailseite
├── matches.html        # Spielplan
├── anmelden.html       # Login-Seite
├── style.css           # Haupt-Stylesheet
├── script.js           # Haupt-JavaScript
├── server.js           # Express-Server & API
├── seed.js             # Datenbank-Seed-Logik
├── supabase-schema.sql # Datenbankschema für Supabase
├── .env                # Umgebungsvariablen (nicht in Git)
└── package.json
```

---

## API-Endpunkte (Übersicht)

| Methode | Pfad | Beschreibung | Auth |
|---|---|---|---|
| GET | `/api/news` | Alle veröffentlichten News | Nein |
| GET | `/api/news/:id` | Einzelner Artikel | Nein |
| POST | `/api/news` | Artikel erstellen | Ja |
| PUT | `/api/news/:id` | Artikel bearbeiten | Ja |
| DELETE | `/api/news/:id` | Artikel löschen | Ja |
| GET | `/api/collections/:name` | Collection-Daten lesen | Nein |
| POST | `/api/collections/:name` | Eintrag erstellen | Ja |
| PUT | `/api/collections/:name/:id` | Eintrag bearbeiten | Ja |
| DELETE | `/api/collections/:name/:id` | Eintrag löschen | Ja |
| POST | `/api/media` | Bild hochladen | Ja |
| DELETE | `/api/media/:id` | Bild löschen | Ja |
| POST | `/api/auth/login` | Einloggen | Nein |
| POST | `/api/auth/logout` | Ausloggen | Ja |

Verfügbare Collections: `teams`, `players`, `board`, `games`, `sponsors`, `gallery`, `timeline`, `achievements`, `stats`
