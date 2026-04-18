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
        const balances = await getAccountBalances(agentAddress);
        // getAccountBalances returns stroops — convert to human-readable decimals
        const fromStroops = (s: string) => (parseInt(s) / 1e7).toFixed(7);
        walletBalance = { USDC: fromStroops(balances.USDC), XLM: fromStroops(balances.XLM) };
      } catch {
        walletBalance = { USDC: "0", XLM: "0" };
      }

      // ── SQLite vault positions ────────────────────────────────────────────
      const rows = getVaultPositions(agentAddress);
      const totalFeesSpent = getTotalFeesSpent(agentAddress);

      const vaultPositions = rows.map((row) => {
        const shares = parseFloat(row["shares"] as string);
        return {
          vaultId:         row["vault_id"],
          shares:          String(shares),
          currentValue:    (shares * 1.003).toFixed(7),
          unrealizedYield: (shares * 0.003).toFixed(7),
          depositedAt:     row["deposited_at"],
        };
      });

      // Approx XLM→USDC at $0.10/XLM (display only)
      const usdcFloat      = parseFloat(walletBalance.USDC);
      const xlmInUsdc      = parseFloat(walletBalance.XLM) * 0.10;
      const totalVaultValue = vaultPositions.reduce((sum, p) => sum + parseFloat(p.currentValue), 0);
      const totalValueUSDC = (usdcFloat + xlmInUsdc + totalVaultValue).toFixed(7);

      const netYield = vaultPositions.reduce((sum, p) => sum + parseFloat(p.unrealizedYield), 0);

      res.json({
        walletBalance,
        vaultPositions,
        totalValueUSDC,
        netYield:       netYield.toFixed(7),
        totalFeesSpent: totalFeesSpent.toFixed(7),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch positions";
      res.status(500).json({ error: "POSITIONS_ERROR", message });
    }
  }
);

export default router;
