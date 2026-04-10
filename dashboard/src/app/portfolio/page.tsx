export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold">Portfolio</h1>

      {/* Spending account */}
      <div className="card flex flex-col gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "var(--color-muted)" }}>
          Spending Account
        </h2>
        <p className="text-xl font-semibold">$502.15 <span className="text-sm font-normal" style={{ color: "var(--color-muted)" }}>USDC</span></p>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          5,000 XLM <span className="ml-1">(≈ $427.00)</span>
        </p>
      </div>

      {/* Savings */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Savings</h2>
        <div className="card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>Savings Account #1</p>
              <p className="text-xl font-semibold mt-1">$500.00</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>deposited</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>Interest rate</p>
              <p className="text-lg font-semibold" style={{ color: "var(--color-earn)" }}>5.2%</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>per year</p>
            </div>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>Interest earned</p>
                <p className="text-base font-semibold" style={{ color: "var(--color-earn)" }}>+$3.07</p>
              </div>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        className="w-full py-3 rounded-xl text-sm font-medium border-2 border-dashed transition-colors"
        style={{ borderColor: "var(--color-earn)", color: "var(--color-earn)" }}
      >
        + Move more to savings
      </button>

      {/* Advanced toggle */}
      <details className="card text-xs" style={{ color: "var(--color-muted)" }}>
        <summary className="cursor-pointer font-medium list-none flex items-center gap-1">
          <span>Advanced</span>
          <span>▾</span>
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
