import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  stellarNetwork: optional("STELLAR_NETWORK", "testnet") as "testnet" | "mainnet",
  sorobanRpcUrl: optional("SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
  horizonUrl: optional("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org"),

  agentfiAddress: optional("AGENTFI_STELLAR_ADDRESS", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
  agentfiSecret: optional("AGENTFI_STELLAR_SECRET", ""),

  x402FacilitatorUrl: optional("X402_FACILITATOR_URL", "https://channels.openzeppelin.com/x402/testnet"),

  usdcContractId: optional(
    "USDC_CONTRACT_ID",
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  ),

  vaults: {
    usdc: optional("DEFINDEX_VAULT_USDC_ID", "defindex-blend-usdc-v1"),
    xlm: optional("DEFINDEX_VAULT_XLM_ID", "defindex-blend-xlm-v1"),
  },

  soroswapRouterId: optional(
    "SOROSWAP_ROUTER_ID",
    "CB2GZK2TZ55PXRFVSXZQ3FGKD2FIWH3PKX5IZXB7Q4PW53L37K7MNFP"
  ),

  port: parseInt(optional("PORT", "3001"), 10),
  databasePath: optional("DATABASE_PATH", "./agentfi.db"),
  agentfiBaseUrl: optional("AGENTFI_BASE_URL", "http://localhost:3001"),
} as const;

// Pricing (in USDC)
export const PRICES = {
  swapQuote: "0.001",
  swapExecute: "0.002",
  vaultDeposit: "0.001",
  vaultWithdraw: "0.001",
  vaultApy: "0.0005",
  rebalance: "0.003",
  positions: "0.0005",
} as const;

export const AGENTFI_VERSION = "0.1.0";
