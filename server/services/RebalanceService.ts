import { VaultService } from "./VaultService.js";
import { config } from "../config.js";
import { getVaultPositions } from "../db/database.js";

export type RebalanceAction = "compound" | "shift";

export interface RebalanceRequest {
  agentAddress: string;
  action:       RebalanceAction;
  sourceVault:  string;
  // shift only
  targetVault?: string;
  amount?:      string;
}

export interface RebalanceResult {
  action:            RebalanceAction;
  txHash:            string;
  sourceVault:       string;
  targetVault?:      string;
  amountMoved?:      string;
  yieldCompounded?:  string;
  newSourceShares?:  string;
  settledAt:         string;
  message:           string;
}

export class RebalanceService {
  private vaultService = new VaultService();

  async rebalance(req: RebalanceRequest): Promise<RebalanceResult> {
    return req.action === "compound"
      ? this.compound(req)
      : this.shift(req);
  }

  private async compound(req: RebalanceRequest): Promise<RebalanceResult> {
    // Withdraw only the accrued yield slice (APY × deposited × elapsed), then re-deposit.
    const positions = getVaultPositions(req.agentAddress);
    const pos = positions.find((p) => p["vault_id"] === req.sourceVault);
    if (!pos || !pos["shares"]) {
      throw new Error(`No position found in vault ${req.sourceVault}`);
    }
    const shares    = parseFloat(pos["shares"] as string);
    const apy       = (pos["last_apy_check"] as number | null) ?? 0;
    const elapsed   = (Date.now() - new Date(pos["deposited_at"] as string).getTime()) / 1000;
    const yieldFrac = (apy / 100) * (elapsed / 31_536_000);
    const yieldShares = Math.max(1, Math.floor(shares * yieldFrac)).toString();

    const withdrawal = await this.vaultService.withdraw({
      vaultId:      req.sourceVault,
      shares:       yieldShares,
      agentAddress: req.agentAddress,
    });

    const deposit = await this.vaultService.deposit({
      vaultId:      req.sourceVault,
      amount:       withdrawal.amountReceived,
      agentAddress: req.agentAddress,
    });

    return {
      action:           "compound",
      txHash:           deposit.txHash,
      sourceVault:      req.sourceVault,
      yieldCompounded:  withdrawal.yieldEarned,
      newSourceShares:  deposit.sharesReceived,
      settledAt:        new Date().toISOString(),
      message: `Compounded ${withdrawal.yieldEarned} stroops of yield back into ${req.sourceVault}`,
    };
  }

  private async shift(req: RebalanceRequest): Promise<RebalanceResult> {
    if (!req.targetVault || !req.amount) {
      throw new Error("targetVault and amount are required for shift action");
    }

    const withdrawal = await this.vaultService.withdraw({
      vaultId:      req.sourceVault,
      shares:       req.amount,
      agentAddress: req.agentAddress,
    });

    const deposit = await this.vaultService.deposit({
      vaultId:      req.targetVault,
      amount:       withdrawal.amountReceived,
      agentAddress: req.agentAddress,
    });

    return {
      action:          "shift",
      txHash:          deposit.txHash,
      sourceVault:     req.sourceVault,
      targetVault:     req.targetVault,
      amountMoved:     withdrawal.amountReceived,
      newSourceShares: deposit.sharesReceived,
      settledAt:       new Date().toISOString(),
      message: `Shifted ${withdrawal.amountReceived} stroops from ${req.sourceVault} to ${req.targetVault}`,
    };
  }
}
