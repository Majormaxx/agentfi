"use client";

import { Coins, Landmark, TrendingUp, ArrowDownToLine, Plus } from "lucide-react";

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold">Portfolio</h1>

      {/* Spending account */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,200,150,0.12)" }}
          >
            <Coins size={16} color="var(--color-earn)" strokeWidth={2} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
            Spending Account
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-tight">$502.15</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>USDC</p>
          </div>
          <div className="text-right">
            <p className="text-base font-semibold">5,000 XLM</p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>≈ $427.00</p>
          </div>
        </div>

        {/* Balance bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: "54%", background: "var(--gradient-earn)" }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>54% allocated to savings</p>
      </div>

      {/* Savings */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Savings</h2>
        <div className="card flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Landmark size={15} color="#3B82F6" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                  Savings Account #1
                </p>
                <p className="text-xl font-semibold mt-0.5 tracking-tight">$500.00</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>deposited</p>
              </div>
            </div>
            <div
              className="flex flex-col items-center px-3 py-1.5 rounded-xl"
              style={{ background: "rgba(0,200,150,0.1)" }}
            >
              <TrendingUp size={14} color="var(--color-earn)" strokeWidth={2.5} />
              <p className="text-lg font-bold leading-none mt-1" style={{ color: "var(--color-earn)" }}>
                5.2%
              </p>
              <p className="text-[10px] font-medium" style={{ color: "var(--color-earn)" }}>APY</p>
            </div>
          </div>

          <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>Interest earned</p>
              <p className="text-base font-semibold" style={{ color: "var(--color-earn)" }}>+$3.07</p>
            </div>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <ArrowDownToLine size={14} strokeWidth={2} />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      <button
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:opacity-80 active:scale-[0.98] border-2 border-dashed"
        style={{ borderColor: "var(--color-earn)", color: "var(--color-earn)" }}
      >
        <Plus size={16} strokeWidth={2.5} />
        Move more to savings
      </button>

      {/* Advanced toggle */}
      <details className="card text-xs" style={{ color: "var(--color-muted)" }}>
        <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
          <span>Advanced</span>
          <span className="text-base">›</span>
        </summary>
        <div className="mt-3 flex flex-col gap-1.5 font-mono">
          <p>Vault: defindex-blend-usdc-v1</p>
          <p>Shares: 498,500,000 stroops</p>
          <p>Contract: CC2R3...7F4K</p>
          <a href="#" className="underline" style={{ color: "var(--color-earn)" }}>
            View on Stellar Explorer →
          </a>
        </div>
      </details>
    </div>
  );
}
