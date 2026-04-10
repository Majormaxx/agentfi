"use client";

import { useEffect, useState } from "react";
import { BalanceCard } from "@/components/BalanceCard";
import { EarnSpendChart } from "@/components/EarnSpendChart";
import { ActivityFeed } from "@/components/ActivityFeed";

interface HomeData {
  totalBalance: string;
  earned: string;
  costs: string;
  agentOn: boolean;
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching dashboard summary from the agent server
    const timer = setTimeout(() => {
      setData({
        totalBalance: "$1,502.15",
        earned: "$3.07",
        costs: "$0.45",
        agentOn: true,
      });
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Total balance + agent status */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: "var(--color-muted)" }}>
            Total Balance
          </p>
          {loading ? (
            <div className="skeleton h-10 w-36 rounded" />
          ) : (
            <p className="balance-xl">{data!.totalBalance}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: loading ? "var(--color-border)" : "var(--color-earn)" }}
            />
            <span className="text-xs font-medium">
              {loading ? "Agent: —" : `Agent: ${data!.agentOn ? "On" : "Off"}`}
            </span>
          </div>
          <button
            disabled={loading}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-opacity"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "…" : data!.agentOn ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {/* Earned / Costs cards */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard
          label="Earned"
          value={data?.earned ?? ""}
          subLabel="this week"
          color="var(--color-earn)"
          prefix="+"
          loading={loading}
        />
        <BalanceCard
          label="Costs"
          value={data?.costs ?? ""}
          subLabel="this week"
          color="var(--color-spend)"
          prefix="-"
          loading={loading}
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
          <ActivityFeed limit={3} loading={loading} />
        </div>
      </div>
    </div>
  );
}
