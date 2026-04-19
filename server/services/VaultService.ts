/**
 * VaultService — deposit, withdraw, and query APY on DeFindex yield vaults.
 *
 * Signs XDRs with AGENTFI_STELLAR_SECRET and submits to Stellar via @defindex/sdk.
 */
import { DefindexSDK, SupportedNetworks } from "@defindex/sdk";
import { config } from "../config.js";
import { signXdr } from "../lib/stellar.js";
import { storeApySnapshot, getAvgApy } from "../db/database.js";

// ── Network helper ────────────────────────────────────────────────────────────

function sdkNetwork(): SupportedNetworks {
  return config.stellarNetwork === "mainnet"
    ? SupportedNetworks.MAINNET
    : SupportedNetworks.TESTNET;
}

// ── Vault ID ↔ contract address mapping ──────────────────────────────────────

function vaultIdToAddress(vaultId: string): string {
  if (vaultId === config.vaults.usdcId || vaultId === config.vaults.usdcAddress) {
    if (!config.vaults.usdcAddress) throw new Error("DEFINDEX_VAULT_USDC_ADDRESS not configured");
    return config.vaults.usdcAddress;
  }
  if (vaultId === config.vaults.xlmId || vaultId === config.vaults.xlmAddress) {
    if (!config.vaults.xlmAddress) throw new Error("DEFINDEX_VAULT_XLM_ADDRESS not configured");
    return config.vaults.xlmAddress;
  }
  if (vaultId.startsWith("C")) return vaultId;
  throw new Error(`Unknown vault: ${vaultId}`);
}

function vaultIdToHumanId(contractAddress: string): string {
  if (contractAddress === config.vaults.usdcAddress) return config.vaults.usdcId;
  if (contractAddress === config.vaults.xlmAddress)  return config.vaults.xlmId;
  return contractAddress;
}

// ── Request / response types ──────────────────────────────────────────────────

export interface VaultDepositRequest {
  vaultId:      string;
  amount:       string; // stroops
  agentAddress: string;
}

export interface VaultDepositResult {
  txHash:             string;
  sharesReceived:     string;
  vaultTotalDeposits: string;
  currentAPY:         string;
  settledAt:          string;
}

export interface VaultWithdrawRequest {
  vaultId:      string;
  shares:       string;
  agentAddress: string;
}

export interface VaultWithdrawResult {
  txHash:         string;
  amountReceived: string;
  yieldEarned:    string;
  settledAt:      string;
}

export interface VaultApyResult {
  vaultId:         string;
  strategy:        string;
  currentAPY:      number;
  sevenDayAvgAPY:  number;
  thirtyDayAvgAPY: number;
  tvl:             string;
  utilizationRate: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class VaultService {
  private sdk: DefindexSDK | null = null;

  private getSDK(): DefindexSDK {
    if (this.sdk) return this.sdk;
    this.sdk = new DefindexSDK({
      apiKey:         config.defindexApiKey || undefined,
      defaultNetwork: sdkNetwork(),
    });
    return this.sdk;
  }

  // ── Deposit ──────────────────────────────────────────────────────────────────

  async deposit(req: VaultDepositRequest): Promise<VaultDepositResult> {
    const sdk          = this.getSDK();
    const vaultAddress = vaultIdToAddress(req.vaultId);
    const amountNum    = parseInt(req.amount, 10);

    const txResp = await sdk.depositToVault(
      vaultAddress,
      { amounts: [amountNum], caller: req.agentAddress, invest: true, slippageBps: 100 },
      sdkNetwork()
    );

    if (!txResp.xdr) throw new Error("DeFindex deposit returned no XDR");
    const signed = signXdr(txResp.xdr);
    const result = await sdk.sendTransaction(signed, sdkNetwork());

    if (!result.success) throw new Error(`Vault deposit failed (tx: ${result.txHash})`);

    const sharesReceived =
      result.result?.type === "vault_deposit"
        ? result.result.sharesMinted
        : String(Math.floor(amountNum * 0.997));

    const [vaultInfo, apyResp] = await Promise.allSettled([
      sdk.getVaultInfo(vaultAddress, sdkNetwork()),
      sdk.getVaultAPY(vaultAddress, sdkNetwork()),
    ]);

    const tvl = vaultInfo.status === "fulfilled"
      ? (vaultInfo.value.totalManagedFunds[0]?.total_amount ?? "0")
      : "0";
    const apy = apyResp.status === "fulfilled"
      ? String(apyResp.value.apy)
      : "0";

    return { txHash: result.txHash, sharesReceived, vaultTotalDeposits: tvl, currentAPY: apy, settledAt: result.createdAt };
  }

  // ── Withdraw ─────────────────────────────────────────────────────────────────

  async withdraw(req: VaultWithdrawRequest): Promise<VaultWithdrawResult> {
    const sdk          = this.getSDK();
    const vaultAddress = vaultIdToAddress(req.vaultId);
    const sharesNum    = parseInt(req.shares, 10);

    const txResp = await sdk.withdrawShares(
      vaultAddress,
      { shares: sharesNum, caller: req.agentAddress, slippageBps: 100 },
      sdkNetwork()
    );

    if (!txResp.xdr) throw new Error("DeFindex withdraw returned no XDR");
    const signed = signXdr(txResp.xdr);
    const result = await sdk.sendTransaction(signed, sdkNetwork());

    if (!result.success) throw new Error(`Vault withdrawal failed (tx: ${result.txHash})`);

    const amountReceived =
      result.result?.type === "vault_withdraw"
        ? result.result.amountsOut[0] ?? String(sharesNum)
        : String(sharesNum);

    const yieldRaw = BigInt(amountReceived) - BigInt(sharesNum);
    const yieldEarned = yieldRaw > 0n ? String(yieldRaw) : "0";

    return { txHash: result.txHash, amountReceived, yieldEarned, settledAt: result.createdAt };
  }

  // ── APY ──────────────────────────────────────────────────────────────────────

  async getApy(vaultId: string): Promise<VaultApyResult> {
    const sdk          = this.getSDK();
    const vaultAddress = vaultIdToAddress(vaultId);
    const humanId      = vaultIdToHumanId(vaultAddress);

    const [apyResp, vaultInfo] = await Promise.all([
      sdk.getVaultAPY(vaultAddress, sdkNetwork()),
      sdk.getVaultInfo(vaultAddress, sdkNetwork()),
    ]);

    const current = apyResp.apy ?? 0;
    const fund    = vaultInfo.totalManagedFunds[0];
    const tvl     = fund?.total_amount ?? "0";

    // Compute utilization from invested vs total (both in stroops as BigInt strings)
    let utilizationRate = 0;
    try {
      const fundAny  = fund as unknown as Record<string, string | undefined>;
      const total    = BigInt(fundAny?.total_amount ?? "0");
      const invested = BigInt(fundAny?.invested_amount ?? fundAny?.invested ?? "0");
      utilizationRate = total > 0n ? Number(invested * 10000n / total) / 10000 : 0;
    } catch { /* leave 0 */ }

    // Persist snapshot so future calls have real historical data
    storeApySnapshot(humanId, current, tvl, utilizationRate);

    const sevenDay   = getAvgApy(humanId, 7)  ?? current;
    const thirtyDay  = getAvgApy(humanId, 30) ?? current;

    return {
      vaultId:         humanId,
      strategy:        `${vaultInfo.name} Lending`,
      currentAPY:      current,
      sevenDayAvgAPY:  parseFloat(sevenDay.toFixed(2)),
      thirtyDayAvgAPY: parseFloat(thirtyDay.toFixed(2)),
      tvl,
      utilizationRate,
    };
  }
}
