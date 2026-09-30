-- Additive global checkout metadata. Existing orders remain KRW/Toss orders.
CREATE TABLE IF NOT EXISTS billing_market (
 order_id TEXT PRIMARY KEY REFERENCES billing_orders(id), provider TEXT NOT NULL CHECK(provider='paddle'),
 currency TEXT NOT NULL CHECK(currency='USD'), price_id TEXT NOT NULL,
 transaction_id TEXT UNIQUE, total_amount INTEGER, tax_amount INTEGER,
 refund_requested INTEGER NOT NULL DEFAULT 0 CHECK(refund_requested IN (0,1)), refund_adjustment_id TEXT
);
INSERT OR IGNORE INTO commerce_meta(version,applied_at)
VALUES('2026-09-30-global-v1',CAST(strftime('%s','now') AS INTEGER)*1000);

CREATE TABLE IF NOT EXISTS purchase_outcome_market (
 decision_id TEXT PRIMARY KEY NOT NULL REFERENCES purchase_outcomes(decision_id),
 currency TEXT NOT NULL CHECK(currency IN ('USD','GBP','CAD','AUD','NZD','KRW'))
);
CREATE TABLE IF NOT EXISTS attendance_visits (
 user_id TEXT NOT NULL, visited_date TEXT NOT NULL, time_zone TEXT NOT NULL, created_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,visited_date,time_zone)
);
