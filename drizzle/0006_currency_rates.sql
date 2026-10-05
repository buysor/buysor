CREATE TABLE IF NOT EXISTS currency_rate_cache (
  base TEXT PRIMARY KEY,
  snapshot_json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
