"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-xl"
      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", fontSize: 12 }}>
      <p className="font-semibold mb-1" style={{ color: "var(--color-muted)", fontSize: 11 }}>{label}</p>
      <p style={{ color: payload[0].color }}>${Number(payload[0].value).toFixed(4)}</p>
    </div>
  );
}

interface Props {
  feesSpent?: number;
  netYield?: number;
}

export function EarnSpendChart({ feesSpent = 0, netYield = 0 }: Props) {
  const hasRealData = feesSpent > 0 || netYield > 0;
  const isSelfSustaining = hasRealData && netYield > feesSpent;

  const data = [
    { label: "Earned",  value: netYield,   color: "#00C896" },
    { label: "Costs",   value: feesSpent,  color: "#F97316" },
  ];

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Performance</span>
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  style={{ background: "var(--color-earn)" }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: "var(--color-earn)" }} />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-earn)" }}>
                Live
              </span>
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>All-time cumulative</p>
        </div>
        {isSelfSustaining && <span className="badge-sustaining">Self-sustaining ↗</span>}
      </div>

      {!hasRealData ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
          <div className="relative flex h-3 w-3 mb-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
              style={{ background: "var(--color-earn)" }} />
            <span className="relative inline-flex rounded-full h-3 w-3"
              style={{ background: "var(--color-earn)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            Agent is warming up
          </p>
          <p className="text-xs max-w-[220px]" style={{ color: "var(--color-muted)" }}>
            Yield and cost history will appear here once the agent makes its first trade.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="35%">
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-border)", opacity: 0.4 }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
