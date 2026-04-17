"use client";

import { ArrowLeftRight, Landmark, TrendingUp, AlertTriangle } from "lucide-react";

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

const TYPE_CONFIG: Record<ActivityItem["type"], { Icon: React.ElementType; color: string; bg: string }> = {
  trade:    { Icon: ArrowLeftRight, color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  savings:  { Icon: Landmark,       color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  interest: { Icon: TrendingUp,     color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  warning:  { Icon: AlertTriangle,  color: "#F97316", bg: "rgba(249,115,22,0.12)" },
};

export function ActivityFeed({ limit = 3, loading }: { limit?: number; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3.5">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-2.5 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const shown = ITEMS.slice(0, limit);

  return (
    <div className="flex flex-col gap-3.5">
      {shown.map((item) => {
        const { Icon, color, bg } = TYPE_CONFIG[item.type];
        return (
          <div key={item.id} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg }}
            >
              <Icon size={14} color={color} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug truncate">{item.message}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{item.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
