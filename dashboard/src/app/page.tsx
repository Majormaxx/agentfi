import { BalanceCard } from "@/components/BalanceCard";
import { EarnSpendChart } from "@/components/EarnSpendChart";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      {/* Total balance + agent status */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: "var(--color-muted)" }}>
            Total Balance
          </p>
          <p className="balance-xl">$1,502.15</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-earn)" }} />
            <span className="text-xs font-medium">Agent: On</span>
          </div>
          <button
            className="px-3 py-1 rounded-lg text-xs font-medium"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            Pause
          </button>
        </div>
      </div>

      {/* Earned / Costs cards */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard
          label="Earned"
          value="$3.07"
          subLabel="this week"
          color="var(--color-earn)"
          prefix="+"
        />
        <BalanceCard
          label="Costs"
          value="$0.45"
          subLabel="this week"
          color="var(--color-spend)"
          prefix="-"
        />
      </div>

      {/* Earn/Spend chart */}
      <EarnSpendChart />

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <a href="#" className="text-xs" style={{ color: "var(--color-earn)" }}>
            See all →
          </a>
        </div>
        <div className="card">
          <ActivityFeed limit={3} />
        </div>
      </div>
    </div>
  );
}
