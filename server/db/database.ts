import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(config.databasePath);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  const schema = fs.readFileSync(
    path.join(__dirname, "schema.sql"),
    "utf-8"
  );
  _db.exec(schema);

  return _db;
}

export function recordTransaction(
  id: string,
  agentAddress: string,
  endpoint: string,
  protocol: "x402" | "mpp",
  feePaidUsdc: number,
  txHash?: string,
  paymentTxHash?: string,
  requestPayload?: object,
  responsePayload?: object,
  status: "pending" | "settled" | "failed" = "settled"
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO transactions
      (id, agent_address, endpoint, payment_protocol, fee_paid_usdc,
       tx_hash, payment_tx_hash, request_payload, response_payload, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    agentAddress,
    endpoint,
    protocol,
    feePaidUsdc,
    txHash ?? null,
    paymentTxHash ?? null,
    requestPayload ? JSON.stringify(requestPayload) : null,
    responsePayload ? JSON.stringify(responsePayload) : null,
    status
  );
}

export function removeVaultPosition(agentAddress: string, vaultId: string): void {
  getDb()
    .prepare("DELETE FROM vault_positions WHERE agent_address = ? AND vault_id = ?")
    .run(agentAddress, vaultId);
}

export function updateBudgetLimit(agentAddress: string, dailyLimitUsdc: number): void {
  getDb().prepare(`
    INSERT INTO agent_budgets (agent_address, daily_limit_usdc, spent_today_usdc)
    VALUES (?, ?, 0.0)
    ON CONFLICT(agent_address) DO UPDATE SET daily_limit_usdc = excluded.daily_limit_usdc
  `).run(agentAddress, dailyLimitUsdc);
}

export function upsertVaultPosition(
  id: string,
  agentAddress: string,
  vaultId: string,
  shares: string,
  depositedAmount: string,
  currentApy?: number
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO vault_positions (id, agent_address, vault_id, shares, deposited_amount, last_apy_check)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_address, vault_id)
    DO UPDATE SET shares = excluded.shares, last_apy_check = excluded.last_apy_check
  `).run(id, agentAddress, vaultId, shares, depositedAmount, currentApy ?? null);
}

export function getVaultPositions(agentAddress: string): Record<string, unknown>[] {
  return getDb()
    .prepare("SELECT * FROM vault_positions WHERE agent_address = ?")
    .all(agentAddress) as Record<string, unknown>[];
}

export function getTotalFeesSpent(agentAddress: string): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(fee_paid_usdc), 0) AS total FROM transactions WHERE agent_address = ? AND status = 'settled'")
    .get(agentAddress) as { total: number };
  return row.total;
}

export interface ActivityRow {
  id:               string;
  agent_address:    string;
  endpoint:         string;
  payment_protocol: string;
  fee_paid_usdc:    number;
  tx_hash:          string | null;
  status:           string;
  created_at:       string;
}

export function getRecentActivity(agentAddress: string, limit = 20): ActivityRow[] {
  return getDb()
    .prepare(
      "SELECT id, agent_address, endpoint, payment_protocol, fee_paid_usdc, tx_hash, status, created_at " +
      "FROM transactions WHERE agent_address = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(agentAddress, limit) as ActivityRow[];
}

export interface BudgetRow {
  dailyLimitUsdc: number;
  spentTodayUsdc: number;
  lastReset: string;
}

export function getBudgetRow(agentAddress: string): BudgetRow | null {
  const row = getDb()
    .prepare("SELECT daily_limit_usdc, spent_today_usdc, last_reset FROM agent_budgets WHERE agent_address = ?")
    .get(agentAddress) as { daily_limit_usdc: number; spent_today_usdc: number; last_reset: string } | undefined;
  if (!row) return null;
  return { dailyLimitUsdc: row.daily_limit_usdc, spentTodayUsdc: row.spent_today_usdc, lastReset: row.last_reset };
}

export function storeApySnapshot(
  vaultId: string,
  apy: number,
  tvl: string,
  utilizationRate: number
): void {
  getDb().prepare(`
    INSERT INTO vault_apy_snapshots (id, vault_id, apy, tvl, utilization_rate)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), vaultId, apy, tvl, utilizationRate);
}

export function getAvgApy(vaultId: string, days: number): number | null {
  const row = getDb()
    .prepare(
      "SELECT AVG(apy) AS avg FROM vault_apy_snapshots WHERE vault_id = ? AND captured_at >= datetime('now', ?)"
    )
    .get(vaultId, `-${days} days`) as { avg: number | null };
  return row.avg;
}

// ── Per-user Stellar wallet ────────────────────────────────────────────────────

export interface UserWallet {
  privyUserId:    string;
  stellarAddress: string;
  stellarSecret:  string;
  funded:         boolean;
}

export function getUserWallet(privyUserId: string): UserWallet | null {
  const row = getDb()
    .prepare("SELECT stellar_address, stellar_secret, funded FROM user_wallets WHERE privy_user_id = ?")
    .get(privyUserId) as { stellar_address: string; stellar_secret: string; funded: number } | undefined;
  if (!row) return null;
  return {
    privyUserId,
    stellarAddress: row.stellar_address,
    stellarSecret:  row.stellar_secret,
    funded:         row.funded === 1,
  };
}

export function createUserWallet(
  privyUserId: string,
  stellarAddress: string,
  stellarSecret: string
): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO user_wallets (privy_user_id, stellar_address, stellar_secret)
    VALUES (?, ?, ?)
  `).run(privyUserId, stellarAddress, stellarSecret);
}

export function markWalletFunded(privyUserId: string): void {
  getDb()
    .prepare("UPDATE user_wallets SET funded = 1 WHERE privy_user_id = ?")
    .run(privyUserId);
}
