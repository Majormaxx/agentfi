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

// ── XLM price cache (CoinGecko free API, 60-second TTL) ──────────────────────
let xlmPriceCache = { usd: 0.10, fetchedAt: 0 };
async function getXlmPrice(): Promise<number> {
  if (Date.now() - xlmPriceCache.fetchedAt < 60_000) return xlmPriceCache.usd;
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd"
    );
    const j = await r.json() as { stellar?: { usd?: number } };
    xlmPriceCache = { usd: j.stellar?.usd ?? xlmPriceCache.usd, fetchedAt: Date.now() };
  } catch { /* keep stale value */ }
  return xlmPriceCache.usd;
}

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

      // ── Live XLM price ───────────────────────────────────────────────────
      const xlmUsd = await getXlmPrice();

      // ── SQLite vault positions ────────────────────────────────────────────
      const rows = getVaultPositions(agentAddress);
      const totalFeesSpent = getTotalFeesSpent(agentAddress);

      const vaultPositions = rows.map((row) => {
        // deposited_amount stored in stroops → convert to USDC decimal for yield calc
        const deposited      = parseFloat(row["deposited_amount"] as string) / 1e7;
        const apy            = (row["last_apy_check"] as number | null) ?? 0;
        const elapsed        = (Date.now() - new Date(row["deposited_at"] as string).getTime()) / 1000;
        const currentValue   = deposited * (1 + (apy / 100) * (elapsed / 31_536_000));
        const unrealizedYield = currentValue - deposited;
        return {
          vaultId:         row["vault_id"],
          shares:          row["shares"],
          currentValue:    currentValue.toFixed(7),
          unrealizedYield: unrealizedYield.toFixed(7),
          depositedAt:     row["deposited_at"],
        };
      });

      const usdcFloat      = parseFloat(walletBalance.USDC);
      const xlmInUsdc      = parseFloat(walletBalance.XLM) * xlmUsd;
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
