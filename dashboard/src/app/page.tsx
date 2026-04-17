"use client";

import { useEffect, useState, useCallback } from "react";
import { BalanceCard }    from "@/components/BalanceCard";
import { EarnSpendChart } from "@/components/EarnSpendChart";
import { ActivityFeed }   from "@/components/ActivityFeed";
import { Bot, ChevronRight, RefreshCw } from "lucide-react";
import { api, type PositionsResponse, type ActivityResponse } from "@/lib/api";

export default function HomePage() {
  const [positions, setPositions] = useState<PositionsResponse | null>(null);
  const [activity,  setActivity]  = useState<ActivityResponse | null>(null);
  const [agentOn,   setAgentOn]   = useState(true);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState(false);
  const [ticking,   setTicking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pos, act, status] = await Promise.all([
        api.positions(),
        api.activity(5),
        api.agentStatus(),
      ]);
      setPositions(pos);
      setActivity(act);
      setAgentOn(status.running);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleAgent = async () => {
    if (toggling || ticking) return;
    setToggling(true);
    try {
      // Trigger one agent decision tick
      setTicking(true);
      await api.agentTick();
      setAgentOn((v) => !v);
    } finally {
      setToggling(false);
      setTicking(false);
    }
  };

  const totalBalance = positions
    ? `$${parseFloat(positions.totalValueUSDC).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  const earned = positions
    ? `$${parseFloat(positions.netYield || "0").toFixed(2)}`
    : null;

  const costs = positions
    ? `$${parseFloat(positions.totalFeesSpent || "0").toFixed(2)}`
    : null;

  return (
    <div className="flex flex-col gap-4">

      {error && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span>Backend offline — showing cached data</span>
          <button onClick={fetchData}><RefreshCw size={14} /></button>
        </div>
      )}

      {/* Hero balance card */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
          Total Balance
        </p>
        {loading ? (
          <div className="skeleton h-12 w-40 rounded-lg mb-3" />
        ) : (
          <p className="balance-xl mb-3">{totalBalance ?? "$0.00"}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: agentOn ? "rgba(0,200,150,0.12)" : "var(--color-border)" }}
            >
              <Bot size={16} strokeWidth={2} style={{ color: agentOn ? "var(--color-earn)" : "var(--color-muted)" }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Agent</p>
              <p className="text-xs font-semibold" style={{ color: agentOn ? "var(--color-earn)" : "var(--color-muted)" }}>
                {ticking ? "Thinking…" : agentOn ? "Running" : "Paused"}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleAgent}
            disabled={loading || toggling}
            aria-label="Toggle agent"
            className="relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-40"
            style={{ background: agentOn ? "var(--color-earn)" : "var(--color-border)" }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{ transform: agentOn ? "translateX(24px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* Earned / Costs */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard label="Earned" value={earned ?? ""} subLabel="all time yield"
          color="var(--color-earn)" prefix="+" loading={loading} />
        <BalanceCard label="Costs"  value={costs  ?? ""} subLabel="fees spent"
          color="var(--color-spend)" prefix="-" loading={loading} />
      </div>

      {/* Chart */}
      <EarnSpendChart feesSpent={parseFloat(positions?.totalFeesSpent ?? "0")} />

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-earn)" }}
          >
            <RefreshCw size={11} strokeWidth={2.5} />
            Refresh
          </button>
        </div>
        <div className="card">
          <ActivityFeed
            transactions={activity?.transactions ?? null}
            limit={5}
            loading={loading}
          />
        </div>
      </div>

    </div>
  );
}
