/**
 * MPP (Machine Payment Protocol / mppx) middleware for AgentFi.
 *
 * Uses mppx/express to expose Tempo charge and session intents as
 * Express RequestHandlers alongside the x402 gates.
 *
 * Current status:
 *  - mppx 0.5.x ships Tempo with EVM chain support.
 *  - Stellar-native Tempo payment method is pending upstream in mppx.
 *  - When AGENTFI_STELLAR_SECRET is set, we expose the MPP infrastructure;
 *    the middleware yields 402 challenges that Stellar-aware MPP clients
 *    can respond to once the Stellar payment method lands.
 *  - In dev mode the gate passes every request through so the rest of the
 *    stack can be exercised without credentials.
 */
import type { RequestHandler } from "express";
import { config, PRICES } from "../config";

// mppx/express is the dedicated Express integration — gives us typed
// RequestHandlers from charge/session intents directly.
import { Mppx, tempo, payment } from "mppx/express";

// ── Singleton Mppx instance ───────────────────────────────────────────────────
// tempo() creates both charge and session intents from shared params.
// currency + recipient will be filled from env when Stellar method ships;
// for now we omit them so the instance works in challenge-only mode.
let _mppx: ReturnType<typeof Mppx.create> | null = null;

function getMppx() {
  if (_mppx) return _mppx;
  _mppx = Mppx.create({
    methods: [
      tempo({
        // Stellar-native currency contract and recipient will be set here
        // once mppx ships its Stellar payment method.
        // For EVM testnet demo: uncomment and set:
        //   currency: "0x...",   // USDC contract on Base Sepolia
        //   recipient: "0x...",  // operator EVM address
      }),
    ],
  });
  return _mppx;
}

const devPassthrough: RequestHandler = (_req, _res, next) => next();

/**
 * Returns an MPP charge gate for a given price point as an Express RequestHandler.
 * Compose with the x402 middleware in server/index.ts for dual-protocol coverage.
 */
export function mppChargeGate(endpoint: keyof typeof PRICES): RequestHandler {
  if (!config.isLive) {
    return devPassthrough;
  }

  const amount = PRICES[endpoint];
  const mppx = getMppx();

  // payment() wraps mppx.tempo.charge as a per-route Express RequestHandler.
  return payment(mppx.tempo.charge, { amount });
}

/**
 * Detects whether the incoming request carries an MPP credential
 * (WWW-Authenticate: Tempo or X-Mpp-* headers) rather than an x402 payment.
 * Used by the dual-protocol selector in server/index.ts.
 */
export function hasMppCredential(req: import("express").Request): boolean {
  return (
    !!req.headers["x-mpp-channel"] ||
    !!req.headers["x-mpp-session"] ||
    (req.headers["authorization"] ?? "").toLowerCase().startsWith("tempo ")
  );
}
