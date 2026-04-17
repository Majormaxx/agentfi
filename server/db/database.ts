import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
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

export function getEarnSpendSummary(agentAddress: string, days = 7): { earned_usdc: number; spent_usdc: number }[] {
  // Returns one row with total fees spent over `days` days (earn is tracked separately via vault positions).
  return getDb()
    .prepare(
      "SELECT COALESCE(SUM(fee_paid_usdc), 0) AS spent_usdc, 0 AS earned_usdc " +
      "FROM transactions WHERE agent_address = ? AND status = 'settled' " +
      "AND created_at >= datetime('now', ?)"
    )
    .all(agentAddress, `-${days} days`) as { earned_usdc: number; spent_usdc: number }[];
}
