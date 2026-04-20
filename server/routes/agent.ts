/**
 * Agent control routes
 * GET  /agent/status  — is the loop running, what's the next tick?
 * POST /agent/tick    — trigger one decision cycle immediately
 * POST /agent/pause   — pause the autonomous loop
 * POST /agent/resume  — resume the autonomous loop
 */
import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { agentLoop } from "../services/agentLoopInstance.js";

const router = Router();

const tickLimiter = rateLimit({
  windowMs: 30_000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Only 1 tick per 30 seconds per IP" },
});

router.get("/agent/status", (_req: Request, res: Response) => {
  res.json({
    running:         agentLoop.isRunning(),
    paused:          agentLoop.isPaused(),
    model:           "llama-3.3-70b-versatile",
    provider:        "groq",
    intervalSeconds: 300,
    lastDecision:    agentLoop.getLastDecision(),
    nextTickAt:      agentLoop.getNextTickAt(),
  });
});

router.post("/agent/tick", tickLimiter, async (_req: Request, res: Response) => {
  try {
    const result = await agentLoop.tick();
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tick failed";
    res.status(500).json({ error: "TICK_FAILED", message });
  }
});

router.post("/agent/pause", (_req: Request, res: Response) => {
  agentLoop.pause();
  res.json({ paused: true });
});

router.post("/agent/resume", (_req: Request, res: Response) => {
  agentLoop.resume();
  res.json({ paused: false, nextTickAt: agentLoop.getNextTickAt() });
});

export default router;
