import { Router, Request, Response } from "express";
import { x402Gate } from "../middleware/x402";
import { getVaultPositions, getTotalFeesSpent } from "../db/database";

const router = Router();

/**
 * GET /positions
 * Returns wallet balances, open vault positions, net yield, and total fees.
 * Price: $0.0005 USDC (x402)
 */
router.get(
  "/positions",
  x402Gate("positions", "Query agent portfolio positions and yield summary"),
  async (req: Request, res: Response) => {
    const { agentAddress } = req.query as { agentAddress?: string };

    if (!agentAddress) {
      res.status(400).json({ error: "MISSING_PARAMS", message: "agentAddress is required" });
      return;
    }

    try {
      const rows = getVaultPositions(agentAddress);
      const totalFeesSpent = getTotalFeesSpent(agentAddress);

      // In production: query Horizon for wallet balances
      // For demo: return plausible testnet balances
      const walletBalance = {
        USDC: "1500000000",
        XLM: "5000000000",
      };

      const vaultPositions = rows.map((row) => ({
        vaultId: row["vault_id"],
        shares: row["shares"],
        currentValue: String(BigInt(row["shares"] as string) * BigInt(1003) / BigInt(1000)),
        unrealizedYield: String(BigInt(row["shares"] as string) * BigInt(3) / BigInt(1000)),
        depositedAt: row["deposited_at"],
      }));

      const totalVaultValue = vaultPositions.reduce(
        (sum, p) => sum + BigInt(p.currentValue),
        BigInt(0)
      );

      const totalValueUSDC = String(
        BigInt(walletBalance.USDC) + BigInt(walletBalance.XLM) / BigInt(4) + totalVaultValue
      );

      const netYield = vaultPositions.reduce(
        (sum, p) => sum + BigInt(p.unrealizedYield),
        BigInt(0)
      );

      res.json({
        walletBalance,
        vaultPositions,
        totalValueUSDC,
        netYield: String(netYield),
        totalFeesSpent: String(Math.round(totalFeesSpent * 1e7)),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch positions";
      res.status(500).json({ error: "POSITIONS_ERROR", message });
    }
  }
);

export default router;
