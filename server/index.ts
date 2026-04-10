import express from "express";
import cors from "cors";
import { config } from "./config";
import { buildX402Middleware } from "./middleware/x402";
import healthRouter    from "./routes/health";
import swapRouter      from "./routes/swap";
import vaultRouter     from "./routes/vault";
import positionsRouter from "./routes/positions";
import strategyRouter  from "./routes/strategy";

const app = express();

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── x402 payment gate (all gated routes declared in middleware/x402.ts) ───────
// Must be mounted BEFORE route handlers.
app.use(buildX402Middleware());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", healthRouter);
app.use("/", swapRouter);
app.use("/", vaultRouter);
app.use("/", positionsRouter);
app.use("/", strategyRouter);

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
});

export default app;
