/**
 * Swap routes — x402 payment gates applied globally in server/index.ts.
 * Budget enforcement applied per-route here via checkBudget middleware.
 */
import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { checkBudget } from "../middleware/budget.js";
import { recordTransaction } from "../db/database.js";
import { SwapService }  from "../services/SwapService.js";
import { PRICES }        from "../config.js";

const router = Router();
const swapService = new SwapService();

/**
 * GET /swap/quote
 * Returns the optimal swap route across Soroswap, Phoenix, Aqua, and SDEX.
 * Payment: $0.001 USDC (x402 gate in server/index.ts)
 */
router.get(
  "/swap/quote",
  checkBudget(PRICES.swapQuote, "query"),
  async (req: Request, res: Response) => {
    const { tokenIn, tokenOut, amountIn, slippage } = req.query as Record<string, string>;

    if (!tokenIn || !tokenOut || !amountIn) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "tokenIn, tokenOut, and amountIn are required",
      });
      return;
    }

    const agentAddress = req.query.agentAddress as string | undefined;
    try {
      const result = await swapService.quote({
        tokenIn,
        tokenOut,
        amountIn,
        slippage: parseFloat(slippage ?? "0.5"),
      });
      if (agentAddress) {
        recordTransaction(uuidv4(), agentAddress, "/swap/quote", "x402", parseFloat(PRICES.swapQuote), undefined, undefined, { tokenIn, tokenOut, amountIn }, result);
      }
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Quote failed";
      res.status(422).json({ error: "INSUFFICIENT_LIQUIDITY", message });
    }
  }
);

/**
 * POST /swap/execute
 * Executes a token swap on the best available route on Stellar.
 * Payment: $0.002 USDC (x402 gate in server/index.ts)
 */
router.post(
  "/swap/execute",
  checkBudget(PRICES.swapExecute, "body"),
  async (req: Request, res: Response) => {
    const { tokenIn, tokenOut, amountIn, slippage, agentAddress } = req.body as {
      tokenIn:      string;
      tokenOut:     string;
      amountIn:     string;
      slippage?:    number;
      agentAddress: string;
    };

    if (!tokenIn || !tokenOut || !amountIn || !agentAddress) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "tokenIn, tokenOut, amountIn, and agentAddress are required",
      });
      return;
    }

    try {
      const result = await swapService.execute({
        tokenIn,
        tokenOut,
        amountIn,
        slippage:     slippage ?? 0.5,
        agentAddress,
      });
      recordTransaction(uuidv4(), agentAddress, "/swap/execute", "x402", parseFloat(PRICES.swapExecute), result.txHash, undefined, req.body, result);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Swap failed";
      if (message.toLowerCase().includes("slippage")) {
        res.status(422).json({ error: "SLIPPAGE_EXCEEDED", message });
      } else if (message.toLowerCase().includes("liquidity")) {
        res.status(422).json({ error: "INSUFFICIENT_LIQUIDITY", message });
      } else {
        res.status(504).json({ error: "SETTLEMENT_TIMEOUT", message });
      }
    }
  }
);

export default router;
