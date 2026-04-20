"use client";

import { LimitsPanel } from "@/components/LimitsPanel";
import { Shield } from "lucide-react";

export default function LimitsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,200,150,0.12)" }}
        >
          <Shield size={16} color="var(--color-earn)" strokeWidth={2} />
        </div>
        <h1 className="text-lg font-semibold">Spending Rules</h1>
      </div>

      <LimitsPanel />

      {/* Advanced toggle */}
      <details className="card text-xs" style={{ color: "var(--color-muted)" }}>
        <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
          <span>Advanced</span>
          <span className="text-base">›</span>
        </summary>
        <div className="mt-3 flex flex-col gap-1.5 font-mono">
          <p>Smart Account: CC2R3TESTNET7F4K</p>
          <p>SpendingLimitPolicy: 10 USDC / 86400s</p>
          <p>Whitelisted contracts: 3</p>
          <p>Signer type: Passkey</p>
        </div>
      </details>
    </div>
  );
}
