"use client";

import { useState } from "react";

const DAILY_LIMIT = 10;
const SPENT_TODAY = 4.50;
const PCT = Math.round((SPENT_TODAY / DAILY_LIMIT) * 100);

const ACTIONS = [
  { id: "trade",    label: "Trade currencies",           enabled: true  },
  { id: "savings",  label: "Move to savings",            enabled: true  },
  { id: "withdraw", label: "Withdraw from savings",      enabled: true  },
  { id: "new_fx",   label: "Trade to new currencies",    enabled: false },
];

export function LimitsPanel() {
  const [agentActive, setAgentActive] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      {/* Daily cap */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Daily spending cap</h2>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--color-muted)" }}>Used today</span>
          <span className="font-medium">${SPENT_TODAY.toFixed(2)} / ${DAILY_LIMIT.toFixed(2)}</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${PCT}%`, background: "var(--color-earn)" }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>Resets in 14h 23m</p>
      </div>

      {/* Allowed actions */}
      <div className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Allowed actions</h2>
        {ACTIONS.map((action) => (
          <div key={action.id} className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: action.enabled ? "#D1FAE5" : "var(--color-border)",
                color: action.enabled ? "#065F46" : "var(--color-muted)",
              }}
            >
              {action.enabled ? "✓" : "✗"}
            </span>
            <span className="text-sm">{action.label}</span>
          </div>
        ))}
      </div>

      {/* Agent status */}
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Agent status</p>
          <p className="text-xs mt-0.5" style={{ color: agentActive ? "var(--color-earn)" : "var(--color-muted)" }}>
            {agentActive ? "● Active" : "○ Paused"}
          </p>
        </div>
        <button
          onClick={() => setAgentActive((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: agentActive ? "#FEE2E2" : "#D1FAE5",
            color: agentActive ? "#991B1B" : "#065F46",
          }}
        >
          {agentActive ? "Pause agent" : "Resume agent"}
        </button>
      </div>
    </div>
  );
}
