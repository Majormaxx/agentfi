"use client";

import { ArrowLeftRight, Landmark, TrendingUp, AlertTriangle, Bot } from "lucide-react";
import type { ActivityTransaction } from "@/lib/api";

const ENDPOINT_ICON: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  "/swap/execute":            { Icon: ArrowLeftRight, color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  "agent-loop/swap":          { Icon: Bot,            color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  "/vault/deposit":           { Icon: Landmark,       color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  "agent-loop/vault_deposit": { Icon: Landmark,       color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
  "/vault/withdraw":          { Icon: TrendingUp,     color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  "agent-loop/vault_withdraw":{ Icon: TrendingUp,     color: "#00C896", bg: "rgba(0,200,150,0.12)"  },
  "/strategy/rebalance":      { Icon: Bot,            color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  "agent-loop/rebalance":     { Icon: Bot,            color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  default:                    { Icon: AlertTriangle,  color: "#F97316", bg: "rgba(249,115,22,0.12)"  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

interface Props {
  transactions: ActivityTransaction[] | null;
  limit?: number;
  loading?: boolean;
}

export function ActivityFeed({ transactions, limit = 5, loading }: Props) {
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

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-4">
        <Bot size={24} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          No activity yet — agent is watching the market
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {transactions.slice(0, limit).map((tx) => {
        const cfg = ENDPOINT_ICON[tx.endpoint] ?? ENDPOINT_ICON.default;
        const { Icon, color, bg } = cfg;
        return (
          <div key={tx.id} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon size={14} color={color} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug truncate">{tx.label}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs" style={{ color: "var(--color-muted)" }}>{timeAgo(tx.createdAt)}</p>
                {tx.feePaidUsdc > 0 && (
                  <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                    · ${tx.feePaidUsdc.toFixed(4)} fee
                  </span>
                )}
              </div>
            </div>
            {tx.txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs shrink-0 underline underline-offset-2 hover:opacity-70"
                style={{ color: "var(--color-earn)" }}
              >
                tx
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
