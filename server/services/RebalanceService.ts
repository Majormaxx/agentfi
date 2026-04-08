import { VaultService } from "./VaultService";
import { config } from "../config";

export type RebalanceAction = "compound" | "shift";

export interface RebalanceRequest {
  agentAddress: string;
  action: RebalanceAction;
  sourceVault: string;
  signedAuth: string;
  // shift only
  targetVault?: string;
  amount?: string;
}

export interface RebalanceResult {
  action: RebalanceAction;
  txHash: string;
  sourceVault: string;
  targetVault?: string;
  amountMoved?: string;
  yieldCompounded?: string;
  newSourceShares?: string;
  settledAt: string;
  message: string;
}

export class RebalanceService {
  private vaultService = new VaultService();

  /**
   * Compound: withdraw accrued yield from sourceVault and re-deposit.
   * Shift: exit sourceVault and enter targetVault with a given amount.
   */
  async rebalance(req: RebalanceRequest): Promise<RebalanceResult> {
    if (req.action === "compound") {
      return this.compound(req);
    }
    return this.shift(req);
  }

  private async compound(req: RebalanceRequest): Promise<RebalanceResult> {
    // Simulate harvesting yield: withdraw a small fraction (the yield portion)
    // and immediately re-deposit it into the same vault.
    const yieldShares = "3650000"; // ~0.365 USDC of accrued yield in stroops

    const withdrawal = await this.vaultService.withdraw({
      vaultId: req.sourceVault,
      shares: yieldShares,
      agentAddress: req.agentAddress,
      signedAuth: req.signedAuth,
    });

    const deposit = await this.vaultService.deposit({
      vaultId: req.sourceVault,
      amount: withdrawal.amountReceived,
      token: `USDC:${config.usdcContractId}`,
      agentAddress: req.agentAddress,
      signedAuth: req.signedAuth,
    });

    return {
      action: "compound",
      txHash: deposit.txHash,
      sourceVault: req.sourceVault,
      yieldCompounded: withdrawal.yieldEarned,
      newSourceShares: deposit.sharesReceived,
      settledAt: new Date().toISOString(),
      message: `Compounded ${withdrawal.yieldEarned} stroops of yield back into ${req.sourceVault}`,
    };
  }

  private async shift(req: RebalanceRequest): Promise<RebalanceResult> {
    if (!req.targetVault || !req.amount) {
      throw new Error("targetVault and amount are required for shift action");
    }

    // Step 1: withdraw from source
    const sharesToExit = req.amount;
    const withdrawal = await this.vaultService.withdraw({
      vaultId: req.sourceVault,
      shares: sharesToExit,
      agentAddress: req.agentAddress,
      signedAuth: req.signedAuth,
    });

    // Step 2: deposit into target
    const targetMeta = this.vaultService.getVaultMeta(req.targetVault);
    const deposit = await this.vaultService.deposit({
      vaultId: req.targetVault,
      amount: withdrawal.amountReceived,
      token: `USDC:${config.usdcContractId}`,
      agentAddress: req.agentAddress,
      signedAuth: req.signedAuth,
    });

    return {
      action: "shift",
      txHash: deposit.txHash,
      sourceVault: req.sourceVault,
      targetVault: req.targetVault,
      amountMoved: withdrawal.amountReceived,
      newSourceShares: deposit.sharesReceived,
      settledAt: new Date().toISOString(),
      message: `Shifted ${withdrawal.amountReceived} stroops from ${req.sourceVault} to ${req.targetVault} (${targetMeta.strategy})`,
    };
  }
}
