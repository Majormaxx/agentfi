/**
 * Vault routes — x402 payment gates applied globally in server/index.ts.
 * Budget enforcement applied per-route via checkBudget middleware.
 */
import { Router, Request, Response } from "express";
import { checkBudget } from "../middleware/budget.js";
import { VaultService } from "../services/VaultService.js";
import { SwapService } from "../services/SwapService.js";
import {
  upsertVaultPosition,
  removeVaultPosition,
  recordTransaction,
} from "../db/database.js";
import { PRICES, config } from "../config.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const vaultService = new VaultService();
const swapService = new SwapService();

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
      vaultId: string;
      amount: string;
      token?: string;
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
      const result = await vaultService.deposit(
        { vaultId, amount, agentAddress },
        signingKeypair,
      );

      upsertVaultPosition(
        uuidv4(),
        agentAddress,
        vaultId,
        result.sharesReceived,
        amount,
        parseFloat(result.currentAPY),
      );
      recordTransaction(
        uuidv4(),
        agentAddress,
        "/vault/deposit",
        "x402",
        parseFloat(PRICES.vaultDeposit),
        result.txHash,
        undefined,
        req.body,
        result,
      );

      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      const status = message.includes("VAULT_PAUSED") ? 503 : 422;
      res
        .status(status)
        .json({
          error: status === 503 ? "VAULT_PAUSED" : "DEPOSIT_FAILED",
          message,
        });
    }
  },
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
      vaultId: string;
      shares: string;
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
      const result = await vaultService.withdraw(
        { vaultId, shares, agentAddress },
        signingKeypair,
      );
      removeVaultPosition(agentAddress, vaultId);
      recordTransaction(
        uuidv4(),
        agentAddress,
        "/vault/withdraw",
        "x402",
        parseFloat(PRICES.vaultWithdraw),
        result.txHash,
        undefined,
        req.body,
        result,
      );
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Withdrawal failed";
      res.status(422).json({ error: "WITHDRAWAL_FAILED", message });
    }
  },
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
      res
        .status(400)
        .json({ error: "MISSING_PARAMS", message: "vaultId is required" });
      return;
    }

    try {
      const result = await vaultService.getApy(vaultId);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "APY query failed";
      res.status(404).json({ error: "VAULT_NOT_FOUND", message });
    }
  },
);

/**
 * POST /vault/swap-and-deposit
 * Swap XLM (or other token) to USDC via Soroswap, then deposit the received
 * USDC into a DeFindex yield vault. Both steps execute live on Stellar testnet.
 * Payment: $0.003 USDC (swap $0.002 + deposit $0.001)
 */
router.post(
  "/vault/swap-and-deposit",
  checkBudget(PRICES.rebalance, "body"),
  async (req: Request, res: Response) => {
    const { tokenIn, amountIn, slippage, vaultId, agentAddress } = req.body as {
      tokenIn: string;
      amountIn: string;
      slippage: number;
      vaultId: string;
      agentAddress: string;
    };

    if (!tokenIn || !amountIn || !vaultId || !agentAddress) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "tokenIn, amountIn, vaultId, and agentAddress are required",
      });
      return;
    }

    try {
      const signingKeypair = res.locals.stellarKeypair ?? undefined;

      // Step 1: Swap tokenIn → USDC via Soroswap (live testnet tx)
      const tokenOut = `USDC:${config.usdcContractId}`;
      const swapResult = await swapService.execute(
        {
          tokenIn,
          tokenOut,
          amountIn,
          slippage: slippage ?? 1.0,
          agentAddress,
        },
        signingKeypair,
      );

      // Step 2: Deposit the received USDC into the vault (live testnet tx)
      const depositResult = await vaultService.deposit(
        { vaultId, amount: swapResult.amountOut, agentAddress },
        signingKeypair,
      );

      upsertVaultPosition(
        uuidv4(),
        agentAddress,
        vaultId,
        depositResult.sharesReceived,
        swapResult.amountOut,
        parseFloat(depositResult.currentAPY),
      );
      recordTransaction(
        uuidv4(),
        agentAddress,
        "/vault/swap-and-deposit",
        "x402",
        parseFloat(PRICES.rebalance),
        depositResult.txHash,
        undefined,
        req.body,
        { swap: swapResult, deposit: depositResult },
      );

      res.json({
        swapTxHash: swapResult.txHash,
        depositTxHash: depositResult.txHash,
        amountSwapped: swapResult.amountOut,
        sharesReceived: depositResult.sharesReceived,
        currentAPY: depositResult.currentAPY,
        settledAt: depositResult.settledAt,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Swap-and-deposit failed";
      res.status(422).json({ error: "SWAP_AND_DEPOSIT_FAILED", message });
    }
  },
);

export default router;

