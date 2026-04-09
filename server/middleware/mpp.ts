import { Request, Response, NextFunction, RequestHandler } from "express";
import { config, PRICES } from "../config";

/**
 * Builds an MPP (mppx / Tempo) paywall middleware for a given endpoint.
 *
 * MPP is preferred for high-frequency agent sessions: the agent opens a
 * payment channel once and debits individual operations within it.
 * x402 is used for one-off calls.
 *
 * In dev mode (no AGENTFI_STELLAR_SECRET) the gate is bypassed with a warning.
 */
export function mppGate(
  endpoint: keyof typeof PRICES,
  description: string
): RequestHandler {
  const amount = parseFloat(PRICES[endpoint]);
  const isDevMode = !config.agentfiSecret;

  if (isDevMode) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      console.warn(`[mpp] DEV MODE — skipping MPP gate for ${description} ($${amount} USDC)`);
      next();
    };
  }

  // Production: delegate to mppx
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Mppx = require("mppx");

  const mpp = Mppx.create({
    paymentMethods: [
      Mppx.tempo({
        network: `stellar:${config.stellarNetwork}`,
        asset: "USDC",
        recipientAddress: config.agentfiAddress,
      }),
    ],
  });

  return mpp.paywall({ amount, currency: "USD", description });
}

/**
 * Dual-protocol middleware: accepts EITHER x402 OR MPP payment.
 * Tries x402 first; if the request carries an MPP session token instead,
 * falls through to the MPP gate.
 */
export function dualGate(
  endpoint: keyof typeof PRICES,
  description: string
): RequestHandler[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { x402Gate } = require("./x402");
  return [
    (req: Request, res: Response, next: NextFunction) => {
      const hasMppToken =
        req.headers["x-mpp-session"] || req.headers["authorization"]?.startsWith("MPP ");
      if (hasMppToken) {
        return mppGate(endpoint, description)(req, res, next);
      }
      return x402Gate(endpoint, description)(req, res, next);
    },
  ];
}
