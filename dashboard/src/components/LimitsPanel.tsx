"use client";

import { useState } from "react";
import { Check, X, Bot, Clock } from "lucide-react";

const DAILY_LIMIT = 10;
const SPENT_TODAY = 4.50;
const PCT = Math.round((SPENT_TODAY / DAILY_LIMIT) * 100);

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
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: enabled ? "rgba(0,200,150,0.15)" : "var(--color-border)",
          }}
        >
          {enabled
            ? <Check size={11} color="var(--color-earn)" strokeWidth={3} />
            : <X size={11} color="var(--color-muted)" strokeWidth={2.5} />
          }
        </div>
        <span className="text-sm" style={{ color: enabled ? "var(--color-text)" : "var(--color-muted)" }}>
          {label}
        </span>
      </div>
      {/* Mini toggle */}
      <button
        onClick={onChange}
        aria-label={`Toggle ${label}`}
        className="relative w-10 h-5 rounded-full transition-all duration-300 shrink-0"
        style={{ background: enabled ? "var(--color-earn)" : "var(--color-border)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300"
          style={{ transform: enabled ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

export function LimitsPanel() {
  const [agentActive, setAgentActive] = useState(true);
  const [actions, setActions] = useState(ACTIONS);

  const toggleAction = (id: string) => {
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Daily cap */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Daily Spending Cap</h2>
          <span
            className="text-sm font-semibold"
            style={{ color: PCT > 80 ? "var(--color-spend)" : "var(--color-earn)" }}
          >
            ${SPENT_TODAY.toFixed(2)} / ${DAILY_LIMIT.toFixed(2)}
          </span>
        </div>

        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${PCT}%`,
              background: PCT > 80
                ? "var(--color-spend)"
                : "var(--gradient-earn)",
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            {PCT}% used
          </span>
          <div className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}>
            <Clock size={11} strokeWidth={2} />
            <span className="text-xs">Resets in 14h 23m</span>
          </div>
        </div>
      </div>

      {/* Allowed actions */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Allowed Actions</h2>
        <div className="flex flex-col gap-2.5">
          {actions.map((action) => (
            <ActionToggle
              key={action.id}
              label={action.label}
              enabled={action.enabled}
              onChange={() => toggleAction(action.id)}
            />
          ))}
        </div>
      </div>

      {/* Agent status */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: agentActive ? "rgba(0,200,150,0.12)" : "var(--color-border)" }}
          >
            <Bot size={18} color={agentActive ? "var(--color-earn)" : "var(--color-muted)"} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold">Agent Status</p>
            <p className="text-xs mt-0.5" style={{ color: agentActive ? "var(--color-earn)" : "var(--color-muted)" }}>
              {agentActive ? "Running" : "Paused"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAgentActive((v) => !v)}
          className="relative w-12 h-6 rounded-full transition-all duration-300"
          style={{ background: agentActive ? "var(--color-earn)" : "var(--color-border)" }}
          aria-label={agentActive ? "Pause agent" : "Resume agent"}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
            style={{ transform: agentActive ? "translateX(24px)" : "translateX(0)" }}
          />
        </button>
      </div>
    </div>
  );
}
