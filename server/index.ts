import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { buildX402Middleware } from "./middleware/x402.js";
import { requireAuth } from "./middleware/auth.js";
import healthRouter    from "./routes/health.js";
import swapRouter      from "./routes/swap.js";
import vaultRouter     from "./routes/vault.js";
import positionsRouter from "./routes/positions.js";
import strategyRouter  from "./routes/strategy.js";
import activityRouter  from "./routes/activity.js";
import agentRouter     from "./routes/agent.js";
import { agentLoop }   from "./services/agentLoopInstance.js";

const app = express();

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── x402 payment gate (all gated routes declared in middleware/x402.ts) ───────
// Must be mounted BEFORE route handlers.
app.use(buildX402Middleware());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", healthRouter);
app.use("/", positionsRouter);   // public — dashboard reads
app.use("/", activityRouter);    // public — dashboard reads
app.use("/", agentRouter);       // public — dashboard control
app.use("/", requireAuth, swapRouter);
app.use("/", requireAuth, vaultRouter);
app.use("/", requireAuth, strategyRouter);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[AgentFi error]", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
  }
);

app.listen(config.port, () => {
  const mode = config.isLive ? "LIVE (real testnet)" : "DEV (mock)";
  console.log(
    `AgentFi server running on port ${config.port} ` +
    `[stellar-${config.stellarNetwork}] [mode: ${mode}]`
  );

  // Start AI agent loop only if Groq key is configured
  if (config.groqApiKey) {
    agentLoop.start();
    console.log("[AgentLoop] Groq agent started (llama-3.3-70b-versatile)");
  } else {
    console.warn("[AgentLoop] GROQ_API_KEY not set — agent loop disabled");
  }
});

export default app;
