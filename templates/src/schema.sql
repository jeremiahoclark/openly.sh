CREATE TABLE IF NOT EXISTS slugs (
  slug TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  ts INTEGER NOT NULL,
  ip TEXT NOT NULL,
  ua TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  asn INTEGER,
  as_org TEXT,
  is_prefetch INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_clicks_slug_ts ON clicks(slug, ts);
CREATE INDEX IF NOT EXISTS idx_clicks_filtered ON clicks(slug, is_prefetch, ts);
