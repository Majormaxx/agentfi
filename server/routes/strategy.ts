import { Router, Request, Response } from "express";
import { x402Gate } from "../middleware/x402";
import { RebalanceService } from "../services/RebalanceService";
import type { RebalanceAction } from "../services/RebalanceService";

const router = Router();
const rebalanceService = new RebalanceService();

/**
 * POST /strategy/rebalance
 * Trigger compound (harvest + re-deposit) or shift (exit vault A → enter vault B).
 * Price: $0.003 USDC (x402)
 */
router.post(
  "/strategy/rebalance",
  x402Gate("rebalance", "Execute yield compound or vault shift strategy"),
  async (req: Request, res: Response) => {
    const { agentAddress, action, sourceVault, targetVault, amount, signedAuth } = req.body as {
      agentAddress: string;
      action: RebalanceAction;
      sourceVault: string;
      targetVault?: string;
      amount?: string;
      signedAuth: string;
    };

    if (!agentAddress || !action || !sourceVault || !signedAuth) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "agentAddress, action, sourceVault, and signedAuth are required",
      });
      return;
    }

    if (!["compound", "shift"].includes(action)) {
      res.status(400).json({
        error: "INVALID_ACTION",
        message: 'action must be "compound" or "shift"',
      });
      return;
    }

    if (action === "shift" && (!targetVault || !amount)) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "targetVault and amount are required for shift action",
      });
      return;
    }

    try {
      const result = await rebalanceService.rebalance({
        agentAddress,
        action,
        sourceVault,
        targetVault,
        amount,
        signedAuth,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Rebalance failed";
      res.status(422).json({ error: "REBALANCE_FAILED", message });
    }
  }
);

export default router;
