"use client";

import { useEffect, useState } from "react";
import { BalanceCard } from "@/components/BalanceCard";
import { EarnSpendChart } from "@/components/EarnSpendChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Bot, ChevronRight } from "lucide-react";

interface HomeData {
  totalBalance: string;
  earned: string;
  costs: string;
  agentOn: boolean;
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ totalBalance: "$1,502.15", earned: "$3.07", costs: "$0.45", agentOn: true });
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleAgent = () => {
    if (!data || toggling) return;
    setToggling(true);
    setTimeout(() => {
      setData((d) => d ? { ...d, agentOn: !d.agentOn } : d);
      setToggling(false);
    }, 350);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* Hero balance card */}
      <div className="card" style={{ background: "var(--color-surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
          Total Balance
        </p>

        {loading ? (
          <div className="skeleton h-12 w-40 rounded-lg mb-3" />
        ) : (
          <p className="balance-xl mb-3">{data!.totalBalance}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          {/* Agent label */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: loading || !data?.agentOn ? "var(--color-border)" : "rgba(0,200,150,0.12)" }}
            >
              <Bot size={16} strokeWidth={2}
                style={{ color: loading || !data?.agentOn ? "var(--color-muted)" : "var(--color-earn)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Agent</p>
              {!loading && (
                <p className="text-xs font-semibold"
                  style={{ color: data!.agentOn ? "var(--color-earn)" : "var(--color-muted)" }}>
                  {data!.agentOn ? "Running" : "Paused"}
                </p>
              )}
            </div>
          </div>

          {/* iOS toggle */}
          <button
            onClick={handleToggleAgent}
            disabled={loading || toggling}
            aria-label={data?.agentOn ? "Pause agent" : "Resume agent"}
            className="relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-40 focus:outline-none"
            style={{ background: data?.agentOn ? "var(--color-earn)" : "var(--color-border)" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{ transform: data?.agentOn ? "translateX(24px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* Earned / Costs */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard label="Earned" value={data?.earned ?? ""} subLabel="this week"
          color="var(--color-earn)" prefix="+" loading={loading} />
        <BalanceCard label="Costs"  value={data?.costs  ?? ""} subLabel="this week"
          color="var(--color-spend)" prefix="-" loading={loading} />
      </div>

      {/* Chart */}
      <EarnSpendChart />

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <a href="#" className="flex items-center gap-0.5 text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-earn)" }}>
            See all <ChevronRight size={12} strokeWidth={2.5} />
          </a>
        </div>
        <div className="card">
          <ActivityFeed limit={3} loading={loading} />
        </div>
      </div>

    </div>
  );
}
