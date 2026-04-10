"use client";

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

  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <span
        className="text-2xl font-semibold"
        style={{ color: color ?? "var(--color-text)" }}
      >
        {prefix}{value}
      </span>
      {subLabel && (
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          {subLabel}
        </span>
      )}
    </div>
  );
}
