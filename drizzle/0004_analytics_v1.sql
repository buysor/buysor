-- BUYSOR first-party product analytics. No raw IP addresses are stored.
CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id TEXT PRIMARY KEY NOT NULL,
  visitor_id TEXT NOT NULL,
  user_id TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  entry_path TEXT NOT NULL,
  current_path TEXT NOT NULL,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  device TEXT NOT NULL DEFAULT 'unknown',
  language TEXT NOT NULL DEFAULT 'ko',
  country TEXT,
  page_views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_last_seen ON analytics_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON analytics_sessions(user_id,last_seen);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_source ON analytics_sessions(utm_source,first_seen);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created ON analytics_events(name,created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id,created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created ON analytics_events(session_id,created_at);

CREATE TABLE IF NOT EXISTS purchase_outcomes (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  decision_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('bought','waiting','not_bought')),
  purchase_price INTEGER,
  satisfaction INTEGER CHECK(satisfaction IS NULL OR (satisfaction BETWEEN 1 AND 5)),
  would_choose_again INTEGER CHECK(would_choose_again IS NULL OR would_choose_again IN (0,1)),
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_purchase_outcomes_user_updated ON purchase_outcomes(user_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_purchase_outcomes_status_updated ON purchase_outcomes(status,updated_at);
