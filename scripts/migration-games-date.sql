-- ════════════════════════════════════════════════════════════════
-- Migration: Datumsfeld für eigene Termine (Tabelle games)
-- ────────────────────────────────────────────────────────────────
-- Die Startseite führt den STVV-Ligaspielplan mit den im Redaktions-
-- system erfassten Terminen zusammen und sortiert beides nach dem
-- echten Datum. Dafür braucht "games" ein Datum statt nur Tag/Monat.
--
-- Einspielen: Supabase-Dashboard → SQL Editor → ausführen.
-- Solange die Spalte fehlt, lässt der Server sie beim Speichern weg;
-- die Startseite fällt dann auf Tag/Monat zurück.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE games ADD COLUMN IF NOT EXISTS date DATE;

-- Bestehende Einträge (Tag/Monat als Text) auf ein Datum heben.
-- Jahr = laufendes Jahr, bereits vergangene Termine zählen zum Folgejahr.
UPDATE games
SET date = to_date(
      lpad(regexp_replace(day, '\D', '', 'g'), 2, '0') || '.' ||
      CASE lower(left(month, 3))
        WHEN 'jän' THEN '01' WHEN 'jan' THEN '01' WHEN 'feb' THEN '02'
        WHEN 'mär' THEN '03' WHEN 'mar' THEN '03' WHEN 'apr' THEN '04'
        WHEN 'mai' THEN '05' WHEN 'jun' THEN '06' WHEN 'jul' THEN '07'
        WHEN 'aug' THEN '08' WHEN 'sep' THEN '09' WHEN 'okt' THEN '10'
        WHEN 'oct' THEN '10' WHEN 'nov' THEN '11' WHEN 'dez' THEN '12'
        WHEN 'dec' THEN '12'
      END || '.' ||
      CASE
        WHEN make_date(
               EXTRACT(YEAR FROM CURRENT_DATE)::int,
               CASE lower(left(month, 3))
                 WHEN 'jän' THEN 1 WHEN 'jan' THEN 1 WHEN 'feb' THEN 2
                 WHEN 'mär' THEN 3 WHEN 'mar' THEN 3 WHEN 'apr' THEN 4
                 WHEN 'mai' THEN 5 WHEN 'jun' THEN 6 WHEN 'jul' THEN 7
                 WHEN 'aug' THEN 8 WHEN 'sep' THEN 9 WHEN 'okt' THEN 10
                 WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dez' THEN 12
                 WHEN 'dec' THEN 12
               END,
               regexp_replace(day, '\D', '', 'g')::int
             ) < CURRENT_DATE
        THEN (EXTRACT(YEAR FROM CURRENT_DATE)::int + 1)::text
        ELSE  EXTRACT(YEAR FROM CURRENT_DATE)::text
      END,
      'DD.MM.YYYY')
WHERE date IS NULL
  AND coalesce(regexp_replace(day, '\D', '', 'g'), '') <> ''
  AND lower(left(coalesce(month, ''), 3)) IN
      ('jän','jan','feb','mär','mar','apr','mai','jun','jul','aug','sep','okt','oct','nov','dez','dec');

CREATE INDEX IF NOT EXISTS games_date_idx ON games (date);
