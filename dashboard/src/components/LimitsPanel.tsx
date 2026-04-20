"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Bot, Clock, Pencil } from "lucide-react";
import { api, AGENT_ADDRESS } from "@/lib/api";

const DEFAULT_ACTIONS = [
  { id: "trade",    label: "Trade currencies",        sub: "Agent can swap XLM ↔ USDC",              enabled: true  },
  { id: "savings",  label: "Move to savings",         sub: "Deposit idle funds into yield vault",     enabled: true  },
  { id: "withdraw", label: "Withdraw from savings",   sub: "Pull funds back to spending wallet",      enabled: true  },
  { id: "new_fx",   label: "Trade to new currencies", sub: "Disabled, coming soon",                   enabled: false },
];

type Action = typeof DEFAULT_ACTIONS[number];

function loadActions(): Action[] {
  if (typeof window === "undefined") return DEFAULT_ACTIONS;
  try {
    const stored = localStorage.getItem("agentfi:allowedActions");
    if (stored) return JSON.parse(stored) as Action[];
  } catch { /* ignore */ }
  return DEFAULT_ACTIONS;
}

function saveActions(actions: Action[]) {
  localStorage.setItem("agentfi:allowedActions", JSON.stringify(actions));
}

function ActionToggle({ label, sub, enabled, onChange }: { label: string; sub: string; enabled: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: enabled ? "rgba(0,200,150,0.15)" : "var(--color-border)" }}>
          {enabled
            ? <Check size={11} color="var(--color-earn)" strokeWidth={3} />
            : <X size={11} color="var(--color-muted)" strokeWidth={2.5} />}
        </div>
        <div>
          <span className="text-sm block" style={{ color: enabled ? "var(--color-text)" : "var(--color-muted)" }}>
            {label}
          </span>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>{sub}</span>
        </div>
      </div>
      <button onClick={onChange}
        className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0 ml-3"
        style={{ background: enabled ? "var(--color-earn)" : "var(--color-border)" }}>
        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
          style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}

export function LimitsPanel() {
  const [agentActive, setAgentActive] = useState(true);
  const [toggling,    setToggling]    = useState(false);
  const [actions,     setActions]     = useState<Action[]>(DEFAULT_ACTIONS);
  const [dailyCap,    setDailyCap]    = useState(10);
  const [editingCap,  setEditingCap]  = useState(false);
  const [capInput,    setCapInput]    = useState("10");
  const [savingCap,   setSavingCap]   = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [resetsIn,    setResetsIn]    = useState("...");
  const [spentToday,  setSpentToday]  = useState(0);
  const [budgetPct,   setBudgetPct]   = useState(0);
  const capRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActions(loadActions());

    Promise.all([
      api.agentStatus().catch(() => null),
      api.budget().catch(() => null),
    ]).then(([status, budget]) => {
      if (status) setAgentActive(status.running && !status.paused);
      if (budget) {
        const cap = budget.dailyLimit;
        setDailyCap(cap);
        setCapInput(String(cap));
        setSpentToday(budget.spentToday);
        setBudgetPct(budget.pct);
        setResetsIn(budget.resetsIn);
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleAction = (id: string) => {
    setActions((prev) => {
      const next = prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a);
      saveActions(next);
      return next;
    });
  };

  const handleToggleAgent = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (agentActive) {
        await api.agentPause();
        setAgentActive(false);
      } else {
        await api.agentResume();
        setAgentActive(true);
      }
    } catch {
      // revert optimistic update on failure
      const status = await api.agentStatus().catch(() => null);
      if (status) setAgentActive(status.running && !status.paused);
    } finally {
      setToggling(false);
    }
  };

  const commitCap = async () => {
    const val = parseFloat(capInput);
    if (isNaN(val) || val <= 0) {
      setCapInput(String(dailyCap));
      setEditingCap(false);
      return;
    }
    setEditingCap(false);
    if (val === dailyCap) return;
    setSavingCap(true);
    try {
      await api.setDailyLimit(AGENT_ADDRESS, val);
      setDailyCap(val);
    } catch {
      setCapInput(String(dailyCap));
    } finally {
      setSavingCap(false);
    }
  };

  useEffect(() => {
    if (editingCap) capRef.current?.focus();
  }, [editingCap]);

  return (
    <div className="flex flex-col gap-4">
      {/* Daily cap */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Daily Spending Cap</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: "var(--color-earn)" }}>
              ${spentToday.toFixed(2)} /
            </span>
            {editingCap ? (
              <input ref={capRef} type="number" value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                onBlur={commitCap}
                onKeyDown={(e) => e.key === "Enter" && commitCap()}
                className="w-16 text-sm font-semibold text-right bg-transparent outline-none border-b"
                style={{ color: "var(--color-earn)", borderColor: "var(--color-earn)" }}
              />
            ) : (
              <button onClick={() => setEditingCap(true)} disabled={savingCap}
                className="flex items-center gap-1 hover:opacity-70 transition-opacity disabled:opacity-40"
                style={{ color: "var(--color-earn)" }}>
                <span className="text-sm font-semibold">${dailyCap.toFixed(2)}</span>
                <Pencil size={10} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${budgetPct}%`, background: budgetPct > 80 ? "var(--color-spend)" : "var(--gradient-earn)" }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>{budgetPct.toFixed(1)}% used today</span>
          <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
            <Clock size={11} strokeWidth={2} />
            <span className="text-xs">Resets in {resetsIn}</span>
          </div>
        </div>
      </div>

      {/* Allowed actions */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Allowed Actions</h2>
        <div className="flex flex-col gap-3">
          {actions.map((action) => (
            <ActionToggle key={action.id} label={action.label} sub={action.sub} enabled={action.enabled}
              onChange={() => handleToggleAction(action.id)} />
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
              {loading ? "Loading…" : toggling ? "Updating…" : agentActive ? "Running" : "Paused"}
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>Llama 3.3-70b via Groq</p>
          </div>
        </div>
        <button onClick={handleToggleAgent} disabled={loading || toggling}
          className="relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-40"
          style={{ background: agentActive ? "var(--color-earn)" : "var(--color-border)" }}>
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
            style={{ transform: agentActive ? "translateX(24px)" : "translateX(0)" }} />
        </button>
      </div>
    </div>
  );
}
