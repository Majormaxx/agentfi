import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { checkBudget }      from "../middleware/budget.js";
import { recordTransaction } from "../db/database.js";
import { RebalanceService } from "../services/RebalanceService.js";
import type { RebalanceAction } from "../services/RebalanceService.js";
import { PRICES }            from "../config.js";

const router = Router();
const rebalanceService = new RebalanceService();

/**
 * POST /strategy/rebalance
 * Trigger compound (harvest + re-deposit) or shift (exit vault A → vault B).
 * Payment: $0.003 USDC
 */
router.post(
  "/strategy/rebalance",
  checkBudget(PRICES.rebalance, "body"),
  async (req: Request, res: Response) => {
    const { agentAddress, action, sourceVault, targetVault, amount } = req.body as {
      agentAddress: string;
      action:       RebalanceAction;
      sourceVault:  string;
      targetVault?: string;
      amount?:      string;
    };

    if (!agentAddress || !action || !sourceVault) {
      res.status(400).json({
        error: "MISSING_PARAMS",
        message: "agentAddress, action, and sourceVault are required",
      });
      return;
    }

    if (!["compound", "shift"].includes(action)) {
      res.status(400).json({ error: "INVALID_ACTION", message: 'action must be "compound" or "shift"' });
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
      });
      recordTransaction(uuidv4(), agentAddress, "/strategy/rebalance", "x402", parseFloat(PRICES.rebalance), result.txHash, undefined, req.body, result);
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Rebalance failed";
      res.status(422).json({ error: "REBALANCE_FAILED", message });
    }
  }
);

export default router;
