import { Router, Request, Response } from "express";
import { x402Gate } from "../middleware/x402";
import { VaultService } from "../services/VaultService";
import { upsertVaultPosition } from "../db/database";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const vaultService = new VaultService();

/**
 * POST /vault/deposit
 * Deposit stablecoins into a DeFindex yield vault.
 * Price: $0.001 USDC (x402)
 */
router.post(
  "/vault/deposit",
  x402Gate("vaultDeposit", "Deposit stablecoins into DeFindex yield vault"),
  async (req: Request, res: Response) => {
    const { vaultId, amount, token, agentAddress, signedAuth } = req.body as {
      vaultId: string;
      amount: string;
      token: string;
      agentAddress: string;
      signedAuth: string;
    };

    if (!vaultId || !amount || !token || !agentAddress || !signedAuth) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "vaultId, amount, token, agentAddress, and signedAuth are required",
      });
      return;
    }

    try {
      const result = await vaultService.deposit({ vaultId, amount, token, agentAddress, signedAuth });

      upsertVaultPosition(
        uuidv4(),
        agentAddress,
        vaultId,
        result.sharesReceived,
        amount,
        parseFloat(result.currentAPY)
      );

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      if (message.includes("VAULT_PAUSED")) {
        res.status(503).json({ error: "VAULT_PAUSED", message });
      } else {
        res.status(422).json({ error: "DEPOSIT_FAILED", message });
      }
    }
  }
);

/**
 * POST /vault/withdraw
 * Redeem vault shares and receive underlying tokens plus accrued yield.
 * Price: $0.001 USDC (x402)
 */
router.post(
  "/vault/withdraw",
  x402Gate("vaultWithdraw", "Withdraw from DeFindex yield vault"),
  async (req: Request, res: Response) => {
    const { vaultId, shares, agentAddress, signedAuth } = req.body as {
      vaultId: string;
      shares: string;
      agentAddress: string;
      signedAuth: string;
    };

    if (!vaultId || !shares || !agentAddress || !signedAuth) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "vaultId, shares, agentAddress, and signedAuth are required",
      });
      return;
    }

    try {
      const result = await vaultService.withdraw({ vaultId, shares, agentAddress, signedAuth });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Withdrawal failed";
      res.status(422).json({ error: "WITHDRAWAL_FAILED", message });
    }
  }
);

/**
 * GET /vault/apy
 * Query real-time APY, TVL, and utilization for a DeFindex vault.
 * Price: $0.0005 USDC (x402)
 */
router.get(
  "/vault/apy",
  x402Gate("vaultApy", "Query real-time DeFindex vault APY"),
  async (req: Request, res: Response) => {
    const { vaultId } = req.query as { vaultId?: string };

    if (!vaultId) {
      res.status(400).json({ error: "MISSING_PARAMS", message: "vaultId is required" });
      return;
    }

    try {
      const result = await vaultService.getApy(vaultId);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "APY query failed";
      res.status(404).json({ error: "VAULT_NOT_FOUND", message });
    }
  }
);

export default router;
