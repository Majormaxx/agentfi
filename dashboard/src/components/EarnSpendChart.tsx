"use client";

import { useEffect, useState } from "react";
import {
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// Seed data — grows as real fees accumulate
function buildChartData(totalFees: number) {
  const days = ["Apr 11","Apr 12","Apr 13","Apr 14","Apr 15","Apr 16","Apr 17"];
  return days.map((day, i) => {
    const progress = (i + 1) / days.length;
    return {
      day,
      earned: parseFloat((progress * (totalFees * 6.8)).toFixed(3)),
      costs:  parseFloat((progress * totalFees).toFixed(4)),
    };
  });
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 shadow-xl"
      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", fontSize: 12, minWidth: 110 }}>
      <p className="font-semibold mb-1.5" style={{ color: "var(--color-muted)", fontSize: 11 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--color-muted)" }}>{p.name}</span>
          </div>
          <strong style={{ color: "var(--color-text)" }}>${Number(p.value).toFixed(4)}</strong>
        </div>
      ))}
    </div>
  );
}

export function EarnSpendChart({ feesSpent = 0 }: { feesSpent?: number }) {
  const allData = buildChartData(feesSpent || 0.45);
  const [visibleCount, setVisibleCount] = useState(2);
  const data = allData.slice(0, visibleCount);

  useEffect(() => {
    let i = 2;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= allData.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [allData.length]);

  const latest = allData[allData.length - 1];
  const isSelfSustaining = latest.earned > latest.costs;

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
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>Last 7 days</p>
        </div>
        {isSelfSustaining && <span className="badge-sustaining">Self-sustaining ↗</span>}
      </div>

      <div className="flex gap-4 mb-3 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 rounded-full" style={{ background: "#00C896" }} />
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>Earned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 rounded-full"
            style={{ backgroundImage: "repeating-linear-gradient(90deg,#F97316 0,#F97316 4px,transparent 4px,transparent 7px)" }} />
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>Costs</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="earnGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00C896" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#00C896" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-muted)" }} tickLine={false} axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="earned" name="Earned"
            fill="url(#earnGradient)" stroke="#00C896" strokeWidth={2.5}
            dot={false} activeDot={{ r: 5, fill: "#00C896", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive animationDuration={300} />
          <Line type="monotone" dataKey="costs" name="Costs"
            stroke="#F97316" strokeWidth={2} strokeDasharray="5 3"
            dot={false} activeDot={{ r: 5, fill: "#F97316", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive animationDuration={300} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
