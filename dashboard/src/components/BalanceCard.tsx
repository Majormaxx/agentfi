"use client";

interface BalanceCardProps {
  label: string;
  value: string;
  subLabel?: string;
  color?: string;
  prefix?: string;
}

export function BalanceCard({ label, value, subLabel, color, prefix }: BalanceCardProps) {
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
