import express from "express";
import cors from "cors";
import { config } from "./config";
import healthRouter from "./routes/health";

const app = express();

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", healthRouter);

// Swap, vault, positions, strategy routes are registered as they are built
// (imported conditionally to avoid startup failures during development)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const swapRouter = require("./routes/swap").default;
  app.use("/", swapRouter);
} catch { /* not yet available */ }

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vaultRouter = require("./routes/vault").default;
  app.use("/", vaultRouter);
} catch { /* not yet available */ }

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const positionsRouter = require("./routes/positions").default;
  app.use("/", positionsRouter);
} catch { /* not yet available */ }

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const strategyRouter = require("./routes/strategy").default;
  app.use("/", strategyRouter);
} catch { /* not yet available */ }

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
});

app.listen(config.port, () => {
  console.log(`AgentFi server running on port ${config.port} (stellar-${config.stellarNetwork})`);
});

export default app;
