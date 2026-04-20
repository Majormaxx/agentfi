"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BalanceCard }    from "@/components/BalanceCard";
import { EarnSpendChart } from "@/components/EarnSpendChart";
import { ActivityFeed }   from "@/components/ActivityFeed";
import { Bot, RefreshCw, Zap } from "lucide-react";
import { api, type PositionsResponse, type ActivityResponse, type AgentStatusResponse } from "@/lib/api";

const ACTION_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  hold:           { bg: "rgba(107,114,128,0.12)", color: "#6B7280", label: "HOLD"     },
  swap:           { bg: "rgba(0,200,150,0.12)",   color: "#00C896", label: "SWAP"     },
  vault_deposit:  { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6", label: "DEPOSIT"  },
  vault_withdraw: { bg: "rgba(249,115,22,0.12)",  color: "#F97316", label: "WITHDRAW" },
  rebalance:      { bg: "rgba(139,92,246,0.12)",  color: "#8B5CF6", label: "REBALANCE"},
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function useCountdown(targetIso: string | null) {
  const [secs, setSecs] = useState<number | null>(null);
  useEffect(() => {
    if (!targetIso) return;
    const update = () => {
      const diff = Math.max(0, Math.round((new Date(targetIso).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (secs === null) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function HomePage() {
  const [positions, setPositions] = useState<PositionsResponse | null>(null);
  const [activity,  setActivity]  = useState<ActivityResponse | null>(null);
  const [status,    setStatus]    = useState<AgentStatusResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [ticking,   setTicking]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const tickingRef = useRef(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pos, act, st] = await Promise.all([
        api.positions(),
        api.activity(5),
        api.agentStatus(),
      ]);
      setPositions(pos);
      setActivity(act);
      setStatus(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTrigger = async () => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    setTicking(true);
    try {
      await api.agentTick();
      // Refresh status to pick up new lastDecision
      const st = await api.agentStatus();
      setStatus(st);
    } finally {
      tickingRef.current = false;
      setTicking(false);
    }
  };

  const countdown = useCountdown(status?.nextTickAt ?? null);

  const totalBalance = positions
    ? `$${parseFloat(positions.totalValueUSDC).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;
  const earned = positions ? `$${parseFloat(positions.netYield || "0").toFixed(2)}`      : null;
  const costs  = positions ? `$${parseFloat(positions.totalFeesSpent || "0").toFixed(2)}` : null;
  const feesSpent = parseFloat(positions?.totalFeesSpent ?? "0");
  const xlmBalance = positions ? parseFloat(positions.walletBalance.XLM) : 0;
  const lastDecision = status?.lastDecision ?? null;
  const actionCfg = lastDecision ? (ACTION_COLORS[lastDecision.action] ?? ACTION_COLORS.hold) : null;

  return (
    <div className="flex flex-col gap-4">

      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span>Backend offline. Showing cached data.</span>
          <button onClick={fetchData}><RefreshCw size={14} /></button>
        </div>
      )}

      {/* Hero balance */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
          Total Balance
        </p>
        {loading
          ? <div className="skeleton h-12 w-40 rounded-lg mb-3" />
          : <p className="balance-xl mb-3">{totalBalance ?? "$0.00"}</p>
        }

        {/* Agent status row */}
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,150,0.12)" }}>
              <Bot size={16} strokeWidth={2} style={{ color: "var(--color-earn)" }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Agent</p>
              <p className="text-xs font-semibold" style={{ color: "var(--color-earn)" }}>
                {ticking ? "Thinking…" : "Running"}
                {!ticking && countdown && (
                  <span style={{ color: "var(--color-muted)", fontWeight: 400 }}> · next in {countdown}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={handleTrigger} disabled={loading || ticking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 hover:opacity-80 active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(0,200,150,0.12)", color: "var(--color-earn)", border: "1px solid rgba(0,200,150,0.2)" }}>
            <Zap size={11} strokeWidth={2.5} />
            {ticking ? "Running…" : "Trigger Now"}
          </button>
        </div>
      </div>

      {/* Last agent decision */}
      {!loading && (
        <div className="card flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            Last Decision
          </p>
          {lastDecision && actionCfg ? (
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 mt-0.5"
                style={{ background: actionCfg.bg, color: actionCfg.color }}>
                {actionCfg.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug" style={{ color: "var(--color-text)" }}>
                  {lastDecision.reason}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                  {timeAgo(lastDecision.tickedAt)} · Llama 3.3-70b via Groq
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
              <div className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: "var(--color-earn)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: "var(--color-earn)" }} />
              </div>
              <p className="text-sm">Waiting for first analysis{countdown ? ` in ${countdown}` : "…"}</p>
            </div>
          )}
        </div>
      )}

      {/* Earned / Costs */}
      <div className="grid grid-cols-2 gap-3">
        <BalanceCard label="Earned" value={earned ?? ""} subLabel="all time yield"
          color="var(--color-earn)" prefix="+" loading={loading} />
        <BalanceCard label="Costs" value={costs ?? ""} subLabel="fees spent"
          color="var(--color-spend)" prefix="-" loading={loading} />
      </div>

      {/* Chart */}
      <EarnSpendChart feesSpent={feesSpent} netYield={parseFloat(positions?.netYield ?? "0")} />

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Recent Activity</h2>
          <button onClick={fetchData}
            className="flex items-center gap-1 text-xs font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-earn)" }}>
            <RefreshCw size={11} strokeWidth={2.5} />
            Refresh
          </button>
        </div>
        <div className="card">
          <ActivityFeed
            transactions={activity?.transactions ?? null}
            limit={5}
            loading={loading}
            xlmBalance={xlmBalance}
          />
        </div>
      </div>

    </div>
  );
}
