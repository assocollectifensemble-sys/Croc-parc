-- Limitation du nombre de tentatives de saisie de code.
--
-- L'adresse IP n'est jamais stockee en clair : seule une empreinte HMAC,
-- calculee avec le secret partage, sert de cle. Elle suffit a compter, ne
-- permet pas de remonter a l'adresse, et les lignes sont purgees avec le reste.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT NOT NULL,   -- empreinte IP + type de compteur
  window_start INTEGER NOT NULL, -- debut de la fenetre, en secondes epoch
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
