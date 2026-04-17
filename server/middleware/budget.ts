/**
 * Budget enforcement middleware.
 *
 * Reads the agent's daily spending limit from agent_budgets and rejects
 * requests that would exceed it. This is a server-side mirror of the
 * on-chain SpendingLimitPolicy on the OpenZeppelin Smart Account.
 *
 * Usage: mount AFTER the x402 gate, BEFORE the business-logic handler.
 *   router.post("/swap/execute", x402Gate, checkBudget("0.002"), handler)
 */
import { Request, Response, NextFunction } from "express";
import { getDb } from "../db/database.js";

interface AgentBudgetRow {
  agent_address:    string;
  smart_account_address: string | null;
  daily_limit_usdc: number;
  spent_today_usdc: number;
  last_reset:       string;
}

function loadBudget(agentAddress: string): AgentBudgetRow | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM agent_budgets WHERE agent_address = ?")
    .get(agentAddress) as AgentBudgetRow | null;
}

function resetIfStale(row: AgentBudgetRow): AgentBudgetRow {
  const db          = getDb();
  const resetTime   = new Date(row.last_reset).getTime();
  const msSinceReset = Date.now() - resetTime;
  const ms24h        = 24 * 60 * 60 * 1000;

  if (msSinceReset >= ms24h) {
    db.prepare(
      "UPDATE agent_budgets SET spent_today_usdc = 0, last_reset = CURRENT_TIMESTAMP WHERE agent_address = ?"
    ).run(row.agent_address);
    return { ...row, spent_today_usdc: 0, last_reset: new Date().toISOString() };
  }

  return row;
}

export function recordSpend(agentAddress: string, amountUsdc: number): void {
  const db = getDb();
  // Upsert: create default row if agent doesn't exist yet
  db.prepare(`
    INSERT INTO agent_budgets (agent_address, daily_limit_usdc, spent_today_usdc)
    VALUES (?, 10.0, ?)
    ON CONFLICT(agent_address) DO UPDATE
    SET spent_today_usdc = spent_today_usdc + excluded.spent_today_usdc
  `).run(agentAddress, amountUsdc);
}

/**
 * Returns an Express middleware that enforces the agent's daily USDC budget.
 *
 * @param operationCostUsdc  USDC cost of this endpoint as a numeric string (e.g. "0.002")
 * @param agentAddressSource Where to read the agent address from the request:
 *                           "query" for GET requests, "body" for POST requests.
 */
export function checkBudget(
  operationCostUsdc: string,
  agentAddressSource: "query" | "body" = "body"
): (req: Request, res: Response, next: NextFunction) => void {
  const cost = parseFloat(operationCostUsdc);

  return (req: Request, res: Response, next: NextFunction) => {
    const agentAddress: string | undefined =
      agentAddressSource === "query"
        ? (req.query.agentAddress as string | undefined)
        : (req.body?.agentAddress as string | undefined);

    if (!agentAddress) {
      // No agent address — budget check can't run; let route handler validate
      return next();
    }

    let row = loadBudget(agentAddress);

    if (!row) {
      // First operation for this agent — create default budget entry
      const db = getDb();
      db.prepare(`
        INSERT OR IGNORE INTO agent_budgets (agent_address, daily_limit_usdc, spent_today_usdc)
        VALUES (?, 10.0, 0.0)
      `).run(agentAddress);
      row = loadBudget(agentAddress)!;
    }

    row = resetIfStale(row);

    const wouldSpend = row.spent_today_usdc + cost;
    if (wouldSpend > row.daily_limit_usdc) {
      const resetIn = (() => {
        const msLeft = 24 * 60 * 60 * 1000 - (Date.now() - new Date(row!.last_reset).getTime());
        const h = Math.floor(msLeft / 3_600_000);
        const m = Math.floor((msLeft % 3_600_000) / 60_000);
        return `${h}h ${m}m`;
      })();

      res.status(403).json({
        error: "BUDGET_EXCEEDED",
        message: `Daily spending cap reached ($${row.daily_limit_usdc.toFixed(2)} / $${row.daily_limit_usdc.toFixed(2)}). Resets in ${resetIn}.`,
        details: {
          dailyLimit:      row.daily_limit_usdc,
          spentToday:      row.spent_today_usdc,
          operationCost:   cost,
          resetsIn:        resetIn,
        },
      });
      return;
    }

    // Record spend before the operation executes (optimistic debit)
    recordSpend(agentAddress, cost);
    next();
  };
}
