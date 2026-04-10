"use client";

import { LimitsPanel } from "@/components/LimitsPanel";

export default function LimitsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold">Spending Rules</h1>
      <LimitsPanel />

      {/* Advanced toggle */}
      <details className="card text-xs" style={{ color: "var(--color-muted)" }}>
        <summary className="cursor-pointer font-medium list-none flex items-center gap-1">
          <span>Advanced</span>
          <span>▾</span>
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
