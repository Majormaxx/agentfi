-- AgentFi SQLite schema
-- Tracks all payments, DeFi positions, and agent budget usage.

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  agent_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  payment_protocol TEXT NOT NULL CHECK (payment_protocol IN ('x402', 'mpp')),
  fee_paid_usdc REAL NOT NULL,
  tx_hash TEXT,
  payment_tx_hash TEXT,
  request_payload TEXT,
  response_payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'failed')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE TABLE IF NOT EXISTS vault_positions (
  id TEXT PRIMARY KEY,
  agent_address TEXT NOT NULL,
  vault_id TEXT NOT NULL,
  shares TEXT NOT NULL,
  deposited_amount TEXT NOT NULL,
  deposited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_apy_check REAL,
  UNIQUE(agent_address, vault_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_positions_agent ON vault_positions(agent_address);

CREATE TABLE IF NOT EXISTS agent_budgets (
  agent_address TEXT PRIMARY KEY,
  smart_account_address TEXT,
  daily_limit_usdc REAL NOT NULL DEFAULT 10.0,
  spent_today_usdc REAL NOT NULL DEFAULT 0.0,
  last_reset DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  agent_address TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  amount_usdc REAL,
  tx_hash TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_log_agent ON activity_log(agent_address);
