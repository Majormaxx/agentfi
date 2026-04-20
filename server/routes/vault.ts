/**
 * Vault routes — x402 payment gates applied globally in server/index.ts.
 * Budget enforcement applied per-route via checkBudget middleware.
 */
import { Router, Request, Response } from "express";
import { checkBudget }   from "../middleware/budget.js";
import { VaultService }  from "../services/VaultService.js";
import { upsertVaultPosition, removeVaultPosition, recordTransaction } from "../db/database.js";
import { PRICES }         from "../config.js";
import { v4 as uuidv4 }  from "uuid";

const router = Router();
const vaultService = new VaultService();

/**
 * POST /vault/deposit
 * Deposit stablecoins into a DeFindex yield vault.
 * Payment: $0.001 USDC
 */
router.post(
  "/vault/deposit",
  checkBudget(PRICES.vaultDeposit, "body"),
  async (req: Request, res: Response) => {
    const { vaultId, amount, agentAddress } = req.body as {
      vaultId:      string;
      amount:       string;
      token?:       string;
      agentAddress: string;
    };

    if (!vaultId || !amount || !agentAddress) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "vaultId, amount, and agentAddress are required",
      });
      return;
    }

    try {
      const signingKeypair = res.locals.stellarKeypair ?? undefined;
      const result = await vaultService.deposit({ vaultId, amount, agentAddress }, signingKeypair);

      upsertVaultPosition(uuidv4(), agentAddress, vaultId, result.sharesReceived, amount, parseFloat(result.currentAPY));
      recordTransaction(uuidv4(), agentAddress, "/vault/deposit", "x402", parseFloat(PRICES.vaultDeposit), result.txHash, undefined, req.body, result);

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      const status  = message.includes("VAULT_PAUSED") ? 503 : 422;
      res.status(status).json({ error: status === 503 ? "VAULT_PAUSED" : "DEPOSIT_FAILED", message });
    }
  }
);

/**
 * POST /vault/withdraw
 * Redeem vault shares and receive underlying tokens + accrued yield.
 * Payment: $0.001 USDC
 */
router.post(
  "/vault/withdraw",
  checkBudget(PRICES.vaultWithdraw, "body"),
  async (req: Request, res: Response) => {
    const { vaultId, shares, agentAddress } = req.body as {
      vaultId:      string;
      shares:       string;
      agentAddress: string;
    };

    if (!vaultId || !shares || !agentAddress) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "vaultId, shares, and agentAddress are required",
      });
      return;
    }

    try {
      const signingKeypair = res.locals.stellarKeypair ?? undefined;
      const result = await vaultService.withdraw({ vaultId, shares, agentAddress }, signingKeypair);
      removeVaultPosition(agentAddress, vaultId);
      recordTransaction(uuidv4(), agentAddress, "/vault/withdraw", "x402", parseFloat(PRICES.vaultWithdraw), result.txHash, undefined, req.body, result);
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
 * Payment: $0.0005 USDC
 */
router.get(
  "/vault/apy",
  checkBudget(PRICES.vaultApy, "query"),
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
