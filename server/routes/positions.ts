/**
 * GET /positions
 * Real Horizon balance queries + SQLite vault position snapshot.
 * Payment: $0.0005 USDC
 */
import { Router, Request, Response } from "express";
import { checkBudget }       from "../middleware/budget.js";
import { getVaultPositions, getTotalFeesSpent } from "../db/database.js";
import { getAccountBalances } from "../lib/stellar.js";
import { PRICES }             from "../config.js";

const router = Router();

router.get(
  "/positions",
  checkBudget(PRICES.positions, "query"),
  async (req: Request, res: Response) => {
    const { agentAddress } = req.query as { agentAddress?: string };

    if (!agentAddress) {
      res.status(400).json({ error: "MISSING_PARAMS", message: "agentAddress is required" });
      return;
    }

    try {
      // ── Real Horizon balance query ────────────────────────────────────────
      let walletBalance = { USDC: "0", XLM: "0" };
      try {
        const balances   = await getAccountBalances(agentAddress);
        walletBalance    = { USDC: balances.USDC, XLM: balances.XLM };
      } catch {
        // Account might not exist on testnet yet — return zeros rather than 500
        walletBalance = { USDC: "0", XLM: "0" };
      }

      // ── SQLite vault positions ────────────────────────────────────────────
      const rows = getVaultPositions(agentAddress);
      const totalFeesSpent = getTotalFeesSpent(agentAddress);

      const vaultPositions = rows.map((row) => ({
        vaultId:         row["vault_id"],
        shares:          row["shares"],
        currentValue:    String(BigInt(row["shares"] as string) * BigInt(1003) / BigInt(1000)),
        unrealizedYield: String(BigInt(row["shares"] as string) * BigInt(3)    / BigInt(1000)),
        depositedAt:     row["deposited_at"],
      }));

      const totalVaultValue = vaultPositions.reduce(
        (sum, p) => sum + BigInt(p.currentValue),
        BigInt(0)
      );

      // Approx XLM→USDC conversion at ~$0.10/XLM (for display only)
      const xlmInUsdc = BigInt(walletBalance.XLM) / BigInt(10);
      const totalValueUSDC = String(
        BigInt(walletBalance.USDC) + xlmInUsdc + totalVaultValue
      );

      const netYield = vaultPositions.reduce(
        (sum, p) => sum + BigInt(p.unrealizedYield),
        BigInt(0)
      );

      res.json({
        walletBalance,
        vaultPositions,
        totalValueUSDC,
        netYield:       String(netYield),
        totalFeesSpent: String(Math.round(totalFeesSpent * 1e7)),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch positions";
      res.status(500).json({ error: "POSITIONS_ERROR", message });
    }
  }
);

export default router;
