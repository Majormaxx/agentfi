/**
 * x402 payment middleware for AgentFi.
 *
 * Builds a single x402ResourceServer with ExactStellarScheme registered for
 * the operator's Stellar network, then exports a pre-configured
 * paymentMiddleware that covers all gated routes in one call.
 *
 * In dev mode (AGENTFI_STELLAR_SECRET not set) every gate is bypassed so
 * developers can test business logic without a funded wallet.
 */
import { RequestHandler } from "express";
import { config, PRICES, STELLAR_NETWORK_CAIP2 } from "../config.js";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

// ── Build the resource server once at module load ─────────────────────────────
function buildResourceServer(): x402ResourceServer | null {
  if (!config.agentfiAddress) return null;
  const facilitator = new HTTPFacilitatorClient({ url: config.x402FacilitatorUrl });
  return new x402ResourceServer(facilitator).register(
    STELLAR_NETWORK_CAIP2,
    new ExactStellarScheme()
  );
}

const resourceServer = buildResourceServer();

// ── Route config — all gated endpoints declared once ─────────────────────────
const X402_ROUTES = {
  "GET /swap/quote":          { accepts: { scheme: "exact" as const, price: `$${PRICES.swapQuote}`,   network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Optimal swap quote across Stellar DEXs" },
  "POST /swap/execute":       { accepts: { scheme: "exact" as const, price: `$${PRICES.swapExecute}`,  network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Execute token swap on best Stellar DEX route" },
  "POST /vault/deposit":      { accepts: { scheme: "exact" as const, price: `$${PRICES.vaultDeposit}`, network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Deposit stablecoins into DeFindex yield vault" },
  "POST /vault/withdraw":     { accepts: { scheme: "exact" as const, price: `$${PRICES.vaultWithdraw}`,network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Withdraw from DeFindex yield vault" },
  "GET /vault/apy":           { accepts: { scheme: "exact" as const, price: `$${PRICES.vaultApy}`,    network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Query real-time DeFindex vault APY" },
  "POST /strategy/rebalance": { accepts: { scheme: "exact" as const, price: `$${PRICES.rebalance}`,   network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Execute yield compound or vault shift" },
  "GET /positions":           { accepts: { scheme: "exact" as const, price: `$${PRICES.positions}`,   network: STELLAR_NETWORK_CAIP2, payTo: config.agentfiAddress }, description: "Query agent portfolio and yield summary" },
};

const devPassthrough: RequestHandler = (_req, _res, next) => next();

/**
 * Returns the single x402 payment middleware for the entire server.
 * Mount this BEFORE route handlers in server/index.ts.
 *
 * Live mode: enforces real USDC micropayments on Stellar testnet/mainnet.
 * Dev mode:  logs a warning and passes every request through.
 */
export function buildX402Middleware(): RequestHandler {
  if (!config.isLive || !resourceServer) {
    console.warn(
      "[x402] DEV MODE — payment gates disabled. " +
        "Set AGENTFI_STELLAR_SECRET, SOROSWAP_API_KEY, and DEFINDEX_API_KEY to enable live payments."
    );
    return devPassthrough;
  }

  return paymentMiddleware(
    X402_ROUTES,
    resourceServer,
    undefined,
    undefined,
    false // lazy facilitator sync — avoids blocking server startup
  ) as RequestHandler;
}
