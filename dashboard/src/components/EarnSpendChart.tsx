"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";

// Simulated 7-day data: cumulative earned (green) vs cumulative costs (orange)
const data = [
  { day: "Apr 4", earned: 0.00, costs: 0.00 },
  { day: "Apr 5", earned: 0.21, costs: 0.08 },
  { day: "Apr 6", earned: 0.54, costs: 0.19 },
  { day: "Apr 7", earned: 0.93, costs: 0.27 },
  { day: "Apr 8", earned: 1.48, costs: 0.33 },
  { day: "Apr 9", earned: 2.21, costs: 0.39 },
  { day: "Apr 10", earned: 3.07, costs: 0.45 },
];

const isSelfSustaining = data[data.length - 1].earned > data[data.length - 1].costs;

export function EarnSpendChart() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">Earned vs Costs</span>
        {isSelfSustaining && (
          <span className="badge-sustaining">Self-sustaining ↗</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-muted)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="earned"
            name="Earned"
            fill="#00C89620"
            stroke="#00C896"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="costs"
            name="Costs"
            stroke="#F97316"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
