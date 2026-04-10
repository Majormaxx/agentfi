import dotenv from "dotenv";
dotenv.config();

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  stellarNetwork: optional("STELLAR_NETWORK", "testnet") as "testnet" | "mainnet",
  sorobanRpcUrl: optional("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
  horizonUrl: optional("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"),

  agentfiAddress: optional("AGENTFI_STELLAR_ADDRESS", ""),
  agentfiSecret: optional("AGENTFI_STELLAR_SECRET", ""),

  x402FacilitatorUrl: optional("X402_FACILITATOR_URL", "https://channels.openzeppelin.com/x402/testnet"),

  soroswapApiKey: optional("SOROSWAP_API_KEY", ""),
  defindexApiKey: optional("DEFINDEX_API_KEY", ""),

  // Real Soroban contract addresses
  usdcContractId: optional(
    "USDC_CONTRACT_ID",
    // Circle USDC on Stellar testnet
    "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
  ),

  vaults: {
    usdcAddress: optional("DEFINDEX_VAULT_USDC_ADDRESS", ""),
    xlmAddress:  optional("DEFINDEX_VAULT_XLM_ADDRESS", ""),
    // Human-readable IDs used in API responses
    usdcId: "defindex-blend-usdc-v1",
    xlmId:  "defindex-blend-xlm-v1",
  },

  port: parseInt(optional("PORT", "3001"), 10),
  databasePath: optional("DATABASE_PATH", "./agentfi.db"),
  agentfiBaseUrl: optional("AGENTFI_BASE_URL", "http://localhost:3001"),

  /** True when all credentials are present — enables real on-chain settlement */
  get isLive(): boolean {
    return !!(
      this.agentfiSecret &&
      this.soroswapApiKey &&
      this.defindexApiKey
    );
  },
} as const;

// Pricing (USDC string values consumed by x402 middleware)
export const PRICES = {
  swapQuote: "0.001",
  swapExecute: "0.002",
  vaultDeposit: "0.001",
  vaultWithdraw: "0.001",
  vaultApy: "0.0005",
  rebalance: "0.003",
  positions: "0.0005",
} as const;

// CAIP-2 network identifier for x402 Stellar integration
export const STELLAR_NETWORK_CAIP2 =
  config.stellarNetwork === "mainnet" ? "stellar:pubnet" : "stellar:testnet";

export const AGENTFI_VERSION = "0.1.0";
