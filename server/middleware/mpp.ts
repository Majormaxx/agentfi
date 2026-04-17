/**
 * MPP (mppx) middleware for AgentFi.
 *
 * mppx 0.5.x ships Tempo with EVM chain support via `mppx/express`.
 * Stellar-native Tempo payment method is pending upstream.
 *
 * When AGENTFI_STELLAR_ADDRESS is set and the Stellar method lands, wire in:
 *   const mppx = Mppx.create({ methods: [tempo({ currency: USDC_CONTRACT_ID, recipient: config.agentfiAddress })] })
 *   export const mppGate = (amount: string): RequestHandler => mppx.charge({ amount, currency: USDC_CONTRACT_ID })
 *
 * Until then, routes accept x402 only. MPP clients get a 402 with an x402 challenge.
 */
import type { RequestHandler } from "express";

const passthrough: RequestHandler = (_req, _res, next) => next();

/**
 * Returns a per-route MPP charge gate.
 * Currently a passthrough — x402 middleware handles all payment enforcement.
 * Replace with `mppx.charge({ amount })` once mppx ships Stellar support.
 */
export function mppChargeGate(_amount: string): RequestHandler {
  return passthrough;
}

/**
 * Returns true when a request carries an MPP credential header.
 * Used by dual-protocol route dispatch if needed in the future.
 */
export function hasMppCredential(req: import("express").Request): boolean {
  return (
    !!req.headers["x-mpp-channel"] ||
    !!req.headers["x-mpp-session"] ||
    (req.headers["authorization"] ?? "").toLowerCase().startsWith("tempo ")
  );
}
