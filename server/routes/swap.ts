import { Router, Request, Response } from "express";
import { x402Gate } from "../middleware/x402";
import { SwapService } from "../services/SwapService";

const router = Router();
const swapService = new SwapService();

/**
 * GET /swap/quote
 * Returns the optimal swap route across Soroswap, Phoenix, Aqua, and SDEX.
 * Price: $0.001 USDC (x402)
 */
router.get(
  "/swap/quote",
  x402Gate("swapQuote", "Optimal swap quote across Stellar DEXs"),
  async (req: Request, res: Response) => {
    const { tokenIn, tokenOut, amountIn, slippage } = req.query as Record<string, string>;

    if (!tokenIn || !tokenOut || !amountIn) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "tokenIn, tokenOut, and amountIn are required",
      });
      return;
    }

    try {
      const result = await swapService.quote({
        tokenIn,
        tokenOut,
        amountIn,
        slippage: parseFloat(slippage ?? "0.5"),
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Quote failed";
      res.status(422).json({ error: "INSUFFICIENT_LIQUIDITY", message });
    }
  }
);

/**
 * POST /swap/execute
 * Executes a token swap on the best available route.
 * Price: $0.002 USDC (x402)
 */
router.post(
  "/swap/execute",
  x402Gate("swapExecute", "Execute token swap on best Stellar DEX route"),
  async (req: Request, res: Response) => {
    const { tokenIn, tokenOut, amountIn, slippage, agentAddress, signedAuth } = req.body as {
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      slippage?: number;
      agentAddress: string;
      signedAuth: string;
    };

    if (!tokenIn || !tokenOut || !amountIn || !agentAddress || !signedAuth) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "tokenIn, tokenOut, amountIn, agentAddress, and signedAuth are required",
      });
      return;
    }

    try {
      const result = await swapService.execute({
        tokenIn,
        tokenOut,
        amountIn,
        slippage: slippage ?? 0.5,
        agentAddress,
        signedAuth,
      });
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
