-- Croc Parc Photos - schema initial (Cloudflare D1)
--
-- Applique avec :
--   npx wrangler d1 migrations apply crocparc-photos --local     (developpement)
--   npx wrangler d1 migrations apply crocparc-photos --remote    (production)

-- Une session = un groupe de visiteurs, ouvert par la photo d'une carte.
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,       -- uuid
  code          TEXT NOT NULL,          -- K7M2QP, ou ORPHAN pour les photos sans carte
  card_number   INTEGER,                -- inventaire physique, facultatif
  session_date  TEXT NOT NULL,          -- AAAA-MM-JJ
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,          -- created_at + SESSION_TTL_DAYS
  photo_count   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active'  -- active | orphan | expired | purged
);

-- Une carte reutilisee un autre jour ouvre une session neuve ; reutilisee le
-- meme jour, elle retombe sur la meme. Le pont leve une alerte dans ce cas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_code_date
  ON sessions(code, session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at, status);

CREATE TABLE IF NOT EXISTS photos (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,          -- DSC01234.JPG
  shot_at       TEXT NOT NULL,          -- EXIF DateTimeOriginal, avec decalage
  preview_key   TEXT NOT NULL,          -- cle R2, bucket previews
  thumb_key     TEXT NOT NULL,          -- cle R2, bucket previews
  -- Chemin relatif de l'original SUR LE MINI-PC DU PARC, en slashs.
  -- Les originaux du A7 IV pesent 10 a 20 Mo : ils ne montent sur R2 que
  -- vendus, quand le webhook Stripe appelle POST /fetch-original sur le pont.
  original_path TEXT NOT NULL,
  width         INTEGER,
  height        INTEGER,
  created_at    TEXT NOT NULL
);

-- Idempotence de POST /api/ingest : le pont rejoue, ca ne doit jamais dupliquer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_session_filename
  ON photos(session_id, filename);
CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id, shot_at);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL REFERENCES sessions(id),
  stripe_session_id TEXT UNIQUE,
  email             TEXT,
  product           TEXT NOT NULL,      -- single | pack
  photo_ids         TEXT NOT NULL,      -- tableau JSON
  amount_cents      INTEGER NOT NULL,
  status            TEXT NOT NULL,      -- pending | paid | failed
  download_token    TEXT UNIQUE,
  created_at        TEXT NOT NULL,
  paid_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id, created_at);
