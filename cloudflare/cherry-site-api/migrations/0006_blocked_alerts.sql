CREATE TABLE IF NOT EXISTS blocked_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_masked TEXT NOT NULL,
  asn INTEGER NOT NULL DEFAULT 0,
  network TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL,
  blocked_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocked_at
  ON blocked_requests (blocked_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  alerted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_type_time
  ON alerts (alert_type, alerted_at DESC);
