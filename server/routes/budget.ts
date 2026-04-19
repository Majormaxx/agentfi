/**
 * GET /budget
 * Returns the agent's daily spending budget state.
 * Public read-only endpoint — consumed by the dashboard Limits panel.
 */
import { Router, Request, Response } from "express";
import { getBudgetRow } from "../db/database.js";

const router = Router();

router.get("/budget", (req: Request, res: Response) => {
  const { agentAddress } = req.query as { agentAddress?: string };

  if (!agentAddress) {
    res.status(400).json({ error: "MISSING_PARAMS", message: "agentAddress is required" });
    return;
  }

  const row = getBudgetRow(agentAddress);

  if (!row) {
    res.json({ dailyLimit: 10, spentToday: 0, pct: 0, resetsIn: "24h 0m" });
    return;
  }

  const resetTime   = new Date(row.lastReset).getTime();
  const msSinceReset = Date.now() - resetTime;
  const ms24h        = 24 * 60 * 60 * 1000;

  // If stale reset the numbers to 0 for the display (actual reset happens in middleware)
  const spentToday = msSinceReset >= ms24h ? 0 : row.spentTodayUsdc;
  const msLeft     = msSinceReset >= ms24h ? ms24h : ms24h - msSinceReset;
  const h          = Math.floor(msLeft / 3_600_000);
  const m          = Math.floor((msLeft % 3_600_000) / 60_000);

  res.json({
    dailyLimit: row.dailyLimitUsdc,
    spentToday,
    pct:        Math.min(100, (spentToday / row.dailyLimitUsdc) * 100),
    resetsIn:   `${h}h ${m}m`,
  });
});

export default router;
