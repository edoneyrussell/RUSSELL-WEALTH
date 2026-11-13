-- Additive migration: legacy ACTIVE/DISMISSED storage remains compatible.
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS account_email TEXT;
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS review_state TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS evidence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE security_alerts ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_dedupe ON security_alerts(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_event_ip_time ON security_events(source_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_event_email_time ON security_events(account_email, created_at);
