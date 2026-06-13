-- ═══════════════════════════════════════════════════════════
--   VBC Stainach – Supabase Schema
--   Ausführen in: Supabase Dashboard → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════

-- Benutzer (Admin-Accounts)
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id          BIGSERIAL PRIMARY KEY,
  key         TEXT DEFAULT '',
  name        TEXT NOT NULL DEFAULT '',
  tab_label   TEXT DEFAULT '',
  league      TEXT DEFAULT '',
  season      TEXT DEFAULT '',
  claim       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image       TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Spieler
CREATE TABLE IF NOT EXISTS players (
  id         BIGSERIAL PRIMARY KEY,
  team_id    BIGINT DEFAULT 0,
  name       TEXT NOT NULL DEFAULT '',
  number     TEXT DEFAULT '',
  position   TEXT DEFAULT '',
  photo      TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vorstand
CREATE TABLE IF NOT EXISTS board (
  id         BIGSERIAL PRIMARY KEY,
  role       TEXT DEFAULT '',
  name       TEXT NOT NULL DEFAULT '',
  initials   TEXT DEFAULT '',
  photo      TEXT DEFAULT '',
  featured   BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spiele
CREATE TABLE IF NOT EXISTS games (
  id         BIGSERIAL PRIMARY KEY,
  day        TEXT DEFAULT '',
  month      TEXT DEFAULT '',
  time       TEXT DEFAULT '',
  home       TEXT NOT NULL DEFAULT '',
  away       TEXT NOT NULL DEFAULT '',
  location   TEXT DEFAULT '',
  type       TEXT DEFAULT '',
  league     TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsoren
CREATE TABLE IF NOT EXISTS sponsors (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  logo       TEXT DEFAULT '',
  url        TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galerie
CREATE TABLE IF NOT EXISTS gallery (
  id         BIGSERIAL PRIMARY KEY,
  image      TEXT NOT NULL DEFAULT '',
  alt        TEXT DEFAULT '',
  span       TEXT DEFAULT 'normal',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zeitleiste (Geschichte)
CREATE TABLE IF NOT EXISTS timeline (
  id         BIGSERIAL PRIMARY KEY,
  year       TEXT DEFAULT '',
  title      TEXT NOT NULL DEFAULT '',
  text       TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Erfolge
CREATE TABLE IF NOT EXISTS achievements (
  id         BIGSERIAL PRIMARY KEY,
  num        TEXT DEFAULT '',
  title      TEXT NOT NULL DEFAULT '',
  sub        TEXT DEFAULT '',
  icon       TEXT DEFAULT '',
  featured   BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Statistiken
CREATE TABLE IF NOT EXISTS stats (
  id         BIGSERIAL PRIMARY KEY,
  value      TEXT DEFAULT '',
  label      TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Neuigkeiten (News)
CREATE TABLE IF NOT EXISTS news (
  id           BIGSERIAL PRIMARY KEY,
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT DEFAULT '',
  content      TEXT DEFAULT '',
  image_url    TEXT DEFAULT '',
  tag          TEXT DEFAULT 'Vereinsnews',
  published    BOOLEAN DEFAULT FALSE,
  publish_date DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Medienbibliothek
CREATE TABLE IF NOT EXISTS media (
  id            BIGSERIAL PRIMARY KEY,
  filename      TEXT NOT NULL DEFAULT '',
  original_name TEXT DEFAULT '',
  file_url      TEXT DEFAULT '',
  file_size     BIGINT DEFAULT 0,
  mime_type     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seitentexte (Key-Value)
CREATE TABLE IF NOT EXISTS pages (
  id         BIGSERIAL PRIMARY KEY,
  page       TEXT NOT NULL,
  section    TEXT NOT NULL,
  content    TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page, section)
);

-- Row Level Security: Öffentliches Lesen für Website-Daten erlauben
-- (Der Backend-Server nutzt den Service-Role-Key und umgeht RLS für Schreibvorgänge)
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE players      ENABLE ROW LEVEL SECURITY;
ALTER TABLE board        ENABLE ROW LEVEL SECURITY;
ALTER TABLE games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery      ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline     ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE news         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;

-- Öffentliches Lesen (alle außer users)
CREATE POLICY "public_read_teams"        ON teams        FOR SELECT USING (true);
CREATE POLICY "public_read_players"      ON players      FOR SELECT USING (true);
CREATE POLICY "public_read_board"        ON board        FOR SELECT USING (true);
CREATE POLICY "public_read_games"        ON games        FOR SELECT USING (true);
CREATE POLICY "public_read_sponsors"     ON sponsors     FOR SELECT USING (true);
CREATE POLICY "public_read_gallery"      ON gallery      FOR SELECT USING (true);
CREATE POLICY "public_read_timeline"     ON timeline     FOR SELECT USING (true);
CREATE POLICY "public_read_achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "public_read_stats"        ON stats        FOR SELECT USING (true);
CREATE POLICY "public_read_news"         ON news         FOR SELECT USING (published = true);
CREATE POLICY "public_read_pages"        ON pages        FOR SELECT USING (true);
