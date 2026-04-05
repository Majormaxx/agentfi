import { Request, Response, NextFunction, RequestHandler } from "express";
import { config, PRICES } from "../config";

/**
 * Builds an x402 paywall middleware for a given endpoint.
 *
 * In production this wraps @x402/express with the Stellar facilitator.
 * During local development (no AGENTFI_STELLAR_SECRET set) the gate is
 * bypassed and a warning is logged so developers can test without a wallet.
 */
export function x402Gate(
  endpoint: keyof typeof PRICES,
  description: string
): RequestHandler {
  const amount = PRICES[endpoint];
  const isDevMode = !config.agentfiSecret;

  if (isDevMode) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      console.warn(`[x402] DEV MODE — skipping payment gate for ${description} ($${amount} USDC)`);
      next();
    };
  }

  // Production: delegate to @x402/express
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { paymentMiddleware } = require("@x402/express");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resource } = require("@x402/core");

  const resource = new Resource({
    description,
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
    price: [
      {
        amount: BigInt(Math.round(parseFloat(amount) * 1e7)), // USDC stroops
        asset: `USDC:${config.usdcContractId}`,
        payTo: config.agentfiAddress,
        network: config.stellarNetwork,
      },
    ],
  });

  return paymentMiddleware(resource, { facilitatorUrl: config.x402FacilitatorUrl });
}
