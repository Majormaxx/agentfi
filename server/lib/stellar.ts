/**
 * Stellar / Soroban helpers shared across services.
 *
 * - signXdr:   signs a Soroban transaction XDR with the operator keypair
 * - getBalances: fetches USDC + XLM balances for an address via Horizon
 */
import {
  Keypair,
  Transaction,
  FeeBumpTransaction,
  Networks,
} from "@stellar/stellar-sdk";
import { Horizon } from "@stellar/stellar-sdk";
import { config } from "../config";

// ── Network passphrase ────────────────────────────────────────────────────────
export function getNetworkPassphrase(): string {
  return config.stellarNetwork === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

// ── Operator keypair ─────────────────────────────────────────────────────────
let _keypair: Keypair | null = null;

export function getOperatorKeypair(): Keypair {
  if (_keypair) return _keypair;
  if (!config.agentfiSecret) {
    throw new Error("AGENTFI_STELLAR_SECRET is not set — cannot sign transactions");
  }
  _keypair = Keypair.fromSecret(config.agentfiSecret);
  return _keypair;
}

/**
 * Sign a base64 Soroban transaction XDR with the operator keypair.
 * Returns the signed XDR as a base64 string, ready for submission.
 */
export function signXdr(xdr: string): string {
  const keypair = getOperatorKeypair();
  const networkPassphrase = getNetworkPassphrase();

  // Detect fee-bump vs regular transaction
  let tx: Transaction | FeeBumpTransaction;
  try {
    tx = new Transaction(xdr, networkPassphrase);
  } catch {
    tx = new FeeBumpTransaction(xdr, networkPassphrase);
  }

  if (tx instanceof FeeBumpTransaction) {
    tx.sign(keypair);
  } else {
    tx.sign(keypair);
  }

  return tx.toEnvelope().toXDR("base64");
}

// ── Horizon client ────────────────────────────────────────────────────────────
let _horizon: Horizon.Server | null = null;

export function getHorizonClient(): Horizon.Server {
  if (_horizon) return _horizon;
  _horizon = new Horizon.Server(config.horizonUrl);
  return _horizon;
}

export interface AccountBalances {
  USDC: string;   // in stroops (7 decimal places)
  XLM: string;    // in stroops
  raw: Horizon.HorizonApi.BalanceLine[];
}

/**
 * Fetch USDC and XLM balances for a Stellar address via Horizon.
 * Returns amounts as string stroops (multiply by 10^7 from the decimal Horizon returns).
 */
export async function getAccountBalances(address: string): Promise<AccountBalances> {
  const horizon = getHorizonClient();
  const account = await horizon.loadAccount(address);

  let usdcDecimal = "0";
  let xlmDecimal  = "0";

  for (const balance of account.balances) {
    if (balance.asset_type === "native") {
      xlmDecimal = balance.balance;
    } else if (
      balance.asset_type === "credit_alphanum4" &&
      balance.asset_code === "USDC"
    ) {
      usdcDecimal = balance.balance;
    } else if (
      (balance.asset_type === "liquidity_pool_shares" ||
        balance.asset_type === "credit_alphanum12") &&
      "asset_code" in balance &&
      balance.asset_code === "USDC"
    ) {
      usdcDecimal = balance.balance;
    }
  }

  // Convert decimal balance to stroops (Horizon returns e.g. "10.0000000")
  const toStroops = (decimal: string) =>
    String(Math.round(parseFloat(decimal) * 1e7));

  return {
    USDC: toStroops(usdcDecimal),
    XLM:  toStroops(xlmDecimal),
    raw: account.balances,
  };
}
