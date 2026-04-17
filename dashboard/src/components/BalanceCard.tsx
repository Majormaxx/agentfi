"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

interface BalanceCardProps {
  label: string;
  value: string;
  subLabel?: string;
  color?: string;
  prefix?: string;
  loading?: boolean;
}

export function BalanceCard({ label, value, subLabel, color, prefix, loading }: BalanceCardProps) {
  if (loading) {
    return (
      <div className="card flex flex-col gap-2">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-7 w-24 rounded" />
        <div className="skeleton h-3 w-14 rounded" />
      </div>
    );
  }

  const isPositive = prefix === "+";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
          {label}
        </span>
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <TrendIcon size={12} color={color} strokeWidth={2.5} />
        </div>
      </div>

      <span
        className="text-2xl font-bold tracking-tight block"
        style={{ color: color ?? "var(--color-text)" }}
      >
        {prefix}{value}
      </span>

      {subLabel && (
        <span className="text-xs block" style={{ color: "var(--color-muted)" }}>
          {subLabel}
        </span>
      )}
    </div>
  );
}
