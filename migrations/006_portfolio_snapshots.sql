-- Shared account balance history; also created idempotently at backend startup.
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    account_id INTEGER NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
    recorded_at BIGINT NOT NULL,
    value_cents BIGINT NOT NULL,
    PRIMARY KEY (account_id, recorded_at)
);
