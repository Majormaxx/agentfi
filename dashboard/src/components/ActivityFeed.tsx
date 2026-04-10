"use client";

interface ActivityItem {
  id: string;
  message: string;
  time: string;
  type: "trade" | "savings" | "interest" | "warning";
}

const ITEMS: ActivityItem[] = [
  { id: "1", message: "Traded $10.00 USDC → 234.15 XLM", time: "2 min ago",  type: "trade"    },
  { id: "2", message: "Interest earned: $0.07",            time: "1 hr ago",  type: "interest" },
  { id: "3", message: "Moved $50.00 to savings · 5.2%/yr", time: "3 hr ago",  type: "savings"  },
  { id: "4", message: "Traded $5.00 USDC → 117.08 XLM",   time: "5 hr ago",  type: "trade"    },
  { id: "5", message: "Deposited $500.00 into savings",    time: "Apr 9",     type: "savings"  },
];

const TYPE_COLOR: Record<ActivityItem["type"], string> = {
  trade:    "#00C896",
  savings:  "#3B82F6",
  interest: "#00C896",
  warning:  "#F97316",
};

export function ActivityFeed({ limit = 3, loading }: { limit?: number; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton mt-1 w-2 h-2 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
            <div className="skeleton h-3 w-12 rounded shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  const shown = ITEMS.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      {shown.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <span
            className="mt-0.5 w-2 h-2 rounded-full shrink-0"
            style={{ background: TYPE_COLOR[item.type] }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug">{item.message}</p>
          </div>
          <span className="text-xs shrink-0" style={{ color: "var(--color-muted)" }}>
            {item.time}
          </span>
        </div>
      ))}
    </div>
  );
}
