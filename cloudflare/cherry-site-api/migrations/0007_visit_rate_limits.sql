CREATE TABLE IF NOT EXISTS visit_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visit_rate_limits_updated_at
  ON visit_rate_limits (updated_at);
