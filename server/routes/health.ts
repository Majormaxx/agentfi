import { Router, Request, Response } from "express";
import { config, PRICES, AGENTFI_VERSION } from "../config";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    service: "AgentFi",
    version: AGENTFI_VERSION,
    network: `stellar-${config.stellarNetwork}`,
    protocols: ["x402", "mpp"],
    endpoints: [
      { path: "/swap/quote",         method: "GET",  price: `${PRICES.swapQuote} USDC` },
      { path: "/swap/execute",       method: "POST", price: `${PRICES.swapExecute} USDC` },
      { path: "/vault/deposit",      method: "POST", price: `${PRICES.vaultDeposit} USDC` },
      { path: "/vault/withdraw",     method: "POST", price: `${PRICES.vaultWithdraw} USDC` },
      { path: "/vault/apy",          method: "GET",  price: `${PRICES.vaultApy} USDC` },
      { path: "/strategy/rebalance", method: "POST", price: `${PRICES.rebalance} USDC` },
      { path: "/positions",          method: "GET",  price: `${PRICES.positions} USDC` },
    ],
    supportedTokens: ["USDC", "XLM", "EURC"],
    defiProtocols: ["soroswap", "phoenix", "aqua", "defindex"],
    smartAccountFactory: "CC2R3TESTNET7F4K",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
