"use client";

import { useState, useEffect } from "react";
import { Check, X, Bot, Clock } from "lucide-react";
import { api } from "@/lib/api";

const ACTIONS = [
  { id: "trade",    label: "Trade currencies",        enabled: true  },
  { id: "savings",  label: "Move to savings",         enabled: true  },
  { id: "withdraw", label: "Withdraw from savings",   enabled: true  },
  { id: "new_fx",   label: "Trade to new currencies", enabled: false },
];

function ActionToggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: enabled ? "rgba(0,200,150,0.15)" : "var(--color-border)" }}>
          {enabled
            ? <Check size={11} color="var(--color-earn)" strokeWidth={3} />
            : <X size={11} color="var(--color-muted)" strokeWidth={2.5} />}
        </div>
        <span className="text-sm" style={{ color: enabled ? "var(--color-text)" : "var(--color-muted)" }}>
          {label}
        </span>
      </div>
      <button onClick={onChange}
        className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0"
        style={{ background: enabled ? "var(--color-earn)" : "var(--color-border)" }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
          style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

interface BudgetState {
  dailyLimit: number;
  spentToday: number;
  resetsIn: string;
}

export function LimitsPanel() {
  const [agentActive, setAgentActive] = useState(true);
  const [ticking,     setTicking]     = useState(false);
  const [actions,     setActions]     = useState(ACTIONS);
  const [budget,      setBudget]      = useState<BudgetState>({ dailyLimit: 10, spentToday: 0, resetsIn: "24h 0m" });
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await api.agentStatus();
        setAgentActive(status.running);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Compute reset time (midnight UTC)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const msLeft = midnight.getTime() - now.getTime();
    const h = Math.floor(msLeft / 3_600_000);
    const m = Math.floor((msLeft % 3_600_000) / 60_000);
    setBudget((b) => ({ ...b, resetsIn: `${h}h ${m}m` }));
  }, []);

  const handleToggleAgent = async () => {
    if (ticking) return;
    setTicking(true);
    try {
      await api.agentTick();
      setAgentActive((v) => !v);
    } finally {
      setTicking(false);
    }
  };

  const pct = Math.round((budget.spentToday / budget.dailyLimit) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Daily cap */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Daily Spending Cap</h2>
          <span className="text-sm font-semibold"
            style={{ color: pct > 80 ? "var(--color-spend)" : "var(--color-earn)" }}>
            ${budget.spentToday.toFixed(2)} / ${budget.dailyLimit.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct > 80 ? "var(--color-spend)" : "var(--gradient-earn)" }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>{pct}% used</span>
          <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
            <Clock size={11} strokeWidth={2} />
            <span className="text-xs">Resets in {budget.resetsIn}</span>
          </div>
        </div>
      </div>

      {/* Allowed actions */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Allowed Actions</h2>
        <div className="flex flex-col gap-2.5">
          {actions.map((action) => (
            <ActionToggle key={action.id} label={action.label} enabled={action.enabled}
              onChange={() => setActions((prev) => prev.map((a) => a.id === action.id ? { ...a, enabled: !a.enabled } : a))} />
          ))}
        </div>
      </div>

      {/* Agent status */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: agentActive ? "rgba(0,200,150,0.12)" : "var(--color-border)" }}>
            <Bot size={18} color={agentActive ? "var(--color-earn)" : "var(--color-muted)"} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold">Agent Status</p>
            <p className="text-xs mt-0.5" style={{ color: agentActive ? "var(--color-earn)" : "var(--color-muted)" }}>
              {loading ? "Loading…" : ticking ? "Thinking…" : agentActive ? "Running" : "Paused"}
            </p>
          </div>
        </div>
        <button onClick={handleToggleAgent} disabled={loading || ticking}
          className="relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-40"
          style={{ background: agentActive ? "var(--color-earn)" : "var(--color-border)" }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
            style={{ transform: agentActive ? "translateX(24px)" : "translateX(0)" }} />
        </button>
      </div>
    </div>
  );
}
