import { VaultService } from "./VaultService";
import { config } from "../config";

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
    // Withdraw a representative yield slice then re-deposit it.
    // In live mode VaultService calls DefindexSDK real transactions.
    const yieldShares = "3650000"; // ~0.365 USDC accrued yield in stroops

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
