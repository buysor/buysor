-- Additive v7 schema. NEVER reset or overwrite pre-existing credit_ledger rows.
CREATE TABLE IF NOT EXISTS commerce_meta (version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS credit_lots (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('paid','subscription','bonus','verified_legacy')),
 granted INTEGER NOT NULL CHECK(granted>0), available INTEGER NOT NULL CHECK(available>=0 AND available<=granted),
 expires_at INTEGER, source_key TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL,
 frozen INTEGER NOT NULL DEFAULT 0 CHECK(frozen IN (0,1))
);
CREATE INDEX IF NOT EXISTS credit_lots_user ON credit_lots(user_id,expires_at);
CREATE TABLE IF NOT EXISTS credit_budget_days (
 day TEXT PRIMARY KEY, committed_micro INTEGER NOT NULL DEFAULT 0 CHECK(committed_micro>=0),
 cap_micro INTEGER NOT NULL CHECK(cap_micro>0)
);
CREATE TABLE IF NOT EXISTS credit_runs (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, request_key TEXT NOT NULL, payload_hash TEXT NOT NULL,
 feature TEXT NOT NULL CHECK(feature IN ('lens','standard','deep','rejudge')), credits INTEGER NOT NULL CHECK(credits>0),
 state TEXT NOT NULL CHECK(state IN ('reserved','completed','failed')),
 budget_day TEXT NOT NULL REFERENCES credit_budget_days(day), reserved_micro INTEGER NOT NULL CHECK(reserved_micro>0),
 actual_micro INTEGER, input_tokens INTEGER, output_tokens INTEGER, provider_request_id TEXT,
 result_json TEXT,
 decision_id TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 UNIQUE(user_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS credit_one_inflight ON credit_runs(user_id) WHERE state='reserved';
CREATE TABLE IF NOT EXISTS credit_allocations (
 run_id TEXT NOT NULL REFERENCES credit_runs(id), lot_id TEXT NOT NULL REFERENCES credit_lots(id),
 amount INTEGER NOT NULL CHECK(amount>0), PRIMARY KEY(run_id,lot_id)
);
CREATE TRIGGER IF NOT EXISTS credit_reserve_budget BEFORE INSERT ON credit_runs BEGIN
 SELECT CASE WHEN NEW.state!='reserved' THEN RAISE(ABORT,'INVALID_RUN_STATE') END;
 UPDATE credit_budget_days SET committed_micro=committed_micro+NEW.reserved_micro
 WHERE day=NEW.budget_day AND committed_micro+NEW.reserved_micro<=cap_micro;
 SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'DAILY_AI_BUDGET_EXCEEDED') END;
END;
CREATE TRIGGER IF NOT EXISTS credit_reserve_lot BEFORE INSERT ON credit_allocations BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM credit_runs r JOIN credit_lots l ON l.id=NEW.lot_id
  WHERE r.id=NEW.run_id AND r.user_id=l.user_id AND r.state='reserved' AND l.frozen=0
    AND (l.expires_at IS NULL OR l.expires_at>r.created_at)
    AND NEW.amount+COALESCE((SELECT SUM(amount) FROM credit_allocations WHERE run_id=r.id),0)<=r.credits
 ) THEN RAISE(ABORT,'INVALID_ALLOCATION') END;
 UPDATE credit_lots SET available=available-NEW.amount WHERE id=NEW.lot_id AND available>=NEW.amount;
 SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'INSUFFICIENT_CREDITS') END;
END;
CREATE TRIGGER IF NOT EXISTS credit_finish_guard BEFORE UPDATE OF state ON credit_runs WHEN NEW.state!=OLD.state BEGIN
 SELECT CASE WHEN OLD.state!='reserved' OR NEW.state NOT IN ('completed','failed') THEN RAISE(ABORT,'INVALID_TRANSITION') END;
 SELECT CASE WHEN NEW.state='completed' AND (
   NEW.result_json IS NULL OR (SELECT COALESCE(SUM(amount),0) FROM credit_allocations WHERE run_id=NEW.id)!=NEW.credits
 ) THEN RAISE(ABORT,'INCOMPLETE_ALLOCATION') END;
END;
CREATE TRIGGER IF NOT EXISTS credit_restore_once AFTER UPDATE OF state ON credit_runs WHEN OLD.state='reserved' AND NEW.state='failed' BEGIN
 UPDATE credit_lots SET available=available+(SELECT amount FROM credit_allocations WHERE run_id=NEW.id AND lot_id=credit_lots.id)
 WHERE id IN (SELECT lot_id FROM credit_allocations WHERE run_id=NEW.id);
 -- Provider cost may already exist. Never release the daily budget on timeout/failure.
END;
CREATE TABLE IF NOT EXISTS billing_orders (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL, product_id TEXT NOT NULL, policy_version TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount>0), credits INTEGER NOT NULL CHECK(credits>0),
 status TEXT NOT NULL CHECK(status IN ('pending','paid','refund_pending','refunded','review')),
 payment_key TEXT UNIQUE, created_at INTEGER NOT NULL, paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS billing_orders_user ON billing_orders(user_id,created_at);
CREATE TRIGGER IF NOT EXISTS billing_grant_once AFTER UPDATE OF status ON billing_orders WHEN OLD.status='pending' AND NEW.status='paid' BEGIN
 SELECT CASE WHEN NEW.payment_key IS NULL OR NEW.paid_at IS NULL THEN RAISE(ABORT,'UNVERIFIED_PAYMENT') END;
 INSERT INTO credit_lots(id,user_id,kind,granted,available,expires_at,source_key,created_at)
 VALUES('order:'||NEW.id,NEW.user_id,'paid',NEW.credits,NEW.credits,NULL,'order:'||NEW.id,NEW.paid_at);
END;
CREATE TRIGGER IF NOT EXISTS billing_freeze_refund BEFORE UPDATE OF status ON billing_orders WHEN OLD.status='paid' AND NEW.status='refund_pending' BEGIN
 UPDATE credit_lots SET frozen=1 WHERE source_key='order:'||NEW.id AND available=granted AND frozen=0;
 SELECT CASE WHEN changes()!=1 THEN RAISE(ABORT,'REFUND_REQUIRES_REVIEW') END;
END;
CREATE TRIGGER IF NOT EXISTS billing_complete_refund AFTER UPDATE OF status ON billing_orders WHEN NEW.status='refunded' AND OLD.status='refund_pending' BEGIN
 UPDATE credit_lots SET available=0,frozen=1 WHERE source_key='order:'||NEW.id;
END;
CREATE TRIGGER IF NOT EXISTS billing_restore_refund AFTER UPDATE OF status ON billing_orders WHEN OLD.status='refund_pending' AND NEW.status='paid' BEGIN
 UPDATE credit_lots SET frozen=0 WHERE source_key='order:'||NEW.id;
END;
INSERT OR IGNORE INTO commerce_meta(version,applied_at) VALUES ('2026-09-18-v7',CAST(strftime('%s','now') AS INTEGER)*1000);

CREATE TRIGGER IF NOT EXISTS credit_meter_circuit AFTER UPDATE OF actual_micro ON credit_runs
 WHEN OLD.actual_micro IS NULL AND NEW.actual_micro>OLD.reserved_micro BEGIN
 UPDATE credit_budget_days SET cap_micro=MIN(cap_micro,committed_micro),
 committed_micro=committed_micro+NEW.actual_micro-OLD.reserved_micro WHERE day=NEW.budget_day;
END;
