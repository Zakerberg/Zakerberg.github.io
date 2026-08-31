CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_masked TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT '',
  asn INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT '',
  risk_label TEXT NOT NULL DEFAULT '',
  page_path TEXT NOT NULL,
  visited_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_visited_at
  ON visits (visited_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_visits_ip_time
  ON visits (ip_hash, visited_at DESC, id DESC);
