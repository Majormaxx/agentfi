/**
 * GET /activity
 * Returns recent transactions and a 7-day earn/spend summary for an agent.
 * Free endpoint — no payment gate — consumed by the operator dashboard.
 *
 * Response includes:
 *   - transactions: last N operations (for activity feed)
 *   - summary:      totals used by the earn/spend chart
 */
import { Router, Request, Response } from "express";
import { getRecentActivity, getTotalFeesSpent, getVaultPositions } from "../db/database.js";

const router = Router();

// Endpoint label → human-readable description for the dashboard activity feed
const ENDPOINT_LABELS: Record<string, string> = {
  "/swap/execute":       "Traded",
  "/swap/quote":         "Quoted swap",
  "/vault/deposit":      "Moved to savings",
  "/vault/withdraw":     "Withdrew from savings",
  "/vault/apy":          "Checked interest rate",
  "/strategy/rebalance": "Rebalanced savings",
  "/positions":          "Checked portfolio",
};

router.get("/activity", (req: Request, res: Response) => {
  const { agentAddress, limit } = req.query as { agentAddress?: string; limit?: string };

  if (!agentAddress) {
    res.status(400).json({ error: "MISSING_PARAMS", message: "agentAddress is required" });
    return;
  }

  const pageSize  = Math.min(parseInt(limit ?? "20", 10), 100);
  const rows      = getRecentActivity(agentAddress, pageSize);
  const totalFees = getTotalFeesSpent(agentAddress);

  // Compute real unrealized yield: APY × deposited_amount × time_elapsed
  const positions = getVaultPositions(agentAddress);
  const totalYield = positions.reduce((sum, p) => {
    const deposited = parseFloat((p["deposited_amount"] as string) ?? "0") / 1e7;
    const apy       = (p["last_apy_check"] as number | null) ?? 0;
    const elapsed   = (Date.now() - new Date(p["deposited_at"] as string).getTime()) / 1000;
    return sum + deposited * (apy / 100) * (elapsed / 31_536_000);
  }, 0);

  const transactions = rows.map((row) => ({
    id:          row.id,
    endpoint:    row.endpoint,
    label:       ENDPOINT_LABELS[row.endpoint] ?? row.endpoint,
    protocol:    row.payment_protocol,
    feePaidUsdc: row.fee_paid_usdc,
    txHash:      row.tx_hash,
    status:      row.status,
    createdAt:   row.created_at,
  }));

  res.json({
    transactions,
    summary: {
      totalFeesSpentUsdc:  totalFees,
      totalYieldEarned:    totalYield.toFixed(7), // USDC decimal
      vaultPositionCount:  positions.length,
    },
  });
});

export default router;
