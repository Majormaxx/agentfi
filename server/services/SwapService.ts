/**
 * SwapService — aggregates quotes across Soroswap, Phoenix, Aqua, and SDEX,
 * then executes swaps on-chain via @soroswap/sdk.
 */
import {
  SoroswapSDK,
  SupportedNetworks,
  SupportedProtocols,
  TradeType,
} from "@soroswap/sdk";
import type { QuoteResponse } from "@soroswap/sdk";
import { config } from "../config.js";
import { signXdr } from "../lib/stellar.js";

// ── Token helpers ─────────────────────────────────────────────────────────────

/**
 * Normalise "USDC:CONTRACT" or "XLM:native" to the asset ID the Soroswap SDK expects.
 * Soroswap accepts:
 *   - Soroban contract ID (C...) for SAC-wrapped / Soroban tokens
 *   - "native" for the native XLM asset
 */
function toSoroswapAsset(token: string): string {
  if (token === "XLM:native" || token === "native") return "native";
  const parts = token.split(":");
  return parts.length === 1 ? parts[0] : parts[1]; // return issuer / contract half
}

function sdkNetwork(): SupportedNetworks {
  return config.stellarNetwork === "mainnet"
    ? SupportedNetworks.MAINNET
    : SupportedNetworks.TESTNET;
}

// ── Request / response types ──────────────────────────────────────────────────

export interface SwapQuoteRequest {
  tokenIn:  string;
  tokenOut: string;
  amountIn: string; // stroops
  slippage: number; // percent e.g. 0.5
}

export interface RouteResult {
  protocol:     string;
  path:         string[];
  amountOut:    string;
  priceImpact:  string;
  minAmountOut: string;
  fee:          string;
}

export interface SwapQuoteResult {
  bestRoute:    RouteResult;
  alternatives: Omit<RouteResult, "path" | "minAmountOut" | "fee">[];
  expiresAt:    string;
}

export interface SwapExecuteRequest extends SwapQuoteRequest {
  agentAddress: string;
}

export interface SwapExecuteResult {
  txHash:             string;
  amountOut:          string;
  protocol:           string;
  settledAt:          string;
  stellarExplorerUrl: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SwapService {
  private sdk: SoroswapSDK | null = null;

  private getSDK(): SoroswapSDK {
    if (this.sdk) return this.sdk;
    if (!config.soroswapApiKey) throw new Error("SOROSWAP_API_KEY not configured");
    this.sdk = new SoroswapSDK({
      apiKey: config.soroswapApiKey,
      defaultNetwork: sdkNetwork(),
    });
    return this.sdk;
  }

  async quote(req: SwapQuoteRequest): Promise<SwapQuoteResult> {
    const sdk = this.getSDK();
    const sdkQuote = await sdk.quote({
      assetIn:    toSoroswapAsset(req.tokenIn),
      assetOut:   toSoroswapAsset(req.tokenOut),
      amount:     BigInt(req.amountIn),
      tradeType:  TradeType.EXACT_IN,
      protocols:  [
        SupportedProtocols.SOROSWAP,
        SupportedProtocols.PHOENIX,
        SupportedProtocols.AQUA,
        SupportedProtocols.SDEX,
      ],
      slippageBps: Math.round(req.slippage * 100),
    });

    return this.mapQuoteResponse(sdkQuote, req.tokenIn, req.tokenOut, req.slippage);
  }

  async execute(req: SwapExecuteRequest): Promise<SwapExecuteResult> {
    const sdk = this.getSDK();

    // 1. Get best quote
    const sdkQuote = await sdk.quote({
      assetIn:     toSoroswapAsset(req.tokenIn),
      assetOut:    toSoroswapAsset(req.tokenOut),
      amount:      BigInt(req.amountIn),
      tradeType:   TradeType.EXACT_IN,
      protocols:   [
        SupportedProtocols.SOROSWAP,
        SupportedProtocols.PHOENIX,
        SupportedProtocols.AQUA,
        SupportedProtocols.SDEX,
      ],
      slippageBps: Math.round(req.slippage * 100),
    });

    // 2. Build unsigned XDR
    const buildResponse = await sdk.build({
      quote: sdkQuote,
      from:  req.agentAddress,
      to:    req.agentAddress,
    });

    // 3. Sign with operator keypair
    const signed = signXdr(buildResponse.xdr);

    // 4. Submit to Stellar
    const result = await sdk.send(signed);
    if (!result.success) {
      throw new Error(`Swap failed on-chain (txHash: ${result.txHash})`);
    }

    const amountOut =
      result.result?.type === "swap"
        ? result.result.amountOut
        : sdkQuote.amountOut.toString();

    return {
      txHash:             result.txHash,
      amountOut,
      protocol:           result.protocol,
      settledAt:          result.createdAt,
      stellarExplorerUrl: `https://stellar.expert/explorer/${config.stellarNetwork}/tx/${result.txHash}`,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private mapQuoteResponse(
    q: QuoteResponse,
    tokenIn: string,
    tokenOut: string,
    slippagePct: number
  ): SwapQuoteResult {
    const amountOut      = q.amountOut.toString();
    const slippageFactor = 1 - slippagePct / 100;
    const minAmountOut   = String(BigInt(Math.floor(Number(q.amountOut) * slippageFactor)));
    const bestProtocol   = q.routePlan.length > 0 ? q.routePlan[0].swapInfo.protocol : "soroswap";
    const path           = q.routePlan.length > 0
      ? q.routePlan[0].swapInfo.path
      : [tokenIn.split(":")[0], tokenOut.split(":")[0]];

    return {
      bestRoute: {
        protocol: bestProtocol,
        path,
        amountOut,
        priceImpact: q.priceImpactPct,
        minAmountOut,
        fee: "0.003",
      },
      alternatives: q.routePlan.slice(1).map((rp) => ({
        protocol:    rp.swapInfo.protocol,
        amountOut,
        priceImpact: q.priceImpactPct,
      })),
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    };
  }
}
