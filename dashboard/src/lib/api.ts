const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS ?? "";

async function get<T>(path: string, params?: Record<string, string>, token?: string): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { cache: "no-store", headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const j = await res.json(); msg = j.message ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json();
}

// ── Response types ─────────────────────────────────────────────────────────────

export interface PositionsResponse {
  walletBalance: { USDC: string; XLM: string };
  vaultPositions: Array<{
    vaultId: string;
    shares: string;
    currentValue: string;
    unrealizedYield: string;
    depositedAt: string;
  }>;
  totalValueUSDC: string;
  netYield: string;
  totalFeesSpent: string;
}

export interface ActivityTransaction {
  id: string;
  endpoint: string;
  label: string;
  protocol: string;
  feePaidUsdc: number;
  txHash: string | null;
  status: string;
  createdAt: string;
}

export interface ActivityResponse {
  transactions: ActivityTransaction[];
  summary: {
    totalFeesSpentUsdc: number;
    totalYieldEarned: string;
    vaultPositionCount: number;
  };
}

export interface AgentStatusResponse {
  running: boolean;
  model: string;
  provider: string;
  intervalSeconds: number;
  lastDecision: { action: string; reason: string; tickedAt: string } | null;
  nextTickAt: string | null;
}

export interface WalletMeResponse {
  stellarAddress: string;
  funded: boolean;
}

export interface BudgetResponse {
  dailyLimit: number;
  spentToday: number;
  pct: number;
  resetsIn: string;
}

export interface VaultApyResponse {
  vaultId: string;
  strategy: string;
  currentAPY: number;
  sevenDayAvgAPY: number;
  thirtyDayAvgAPY: number;
  tvl: string;
  utilizationRate: number;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export const api = {
  positions: (agentAddress = AGENT_ADDRESS) =>
    get<PositionsResponse>("/positions", { agentAddress }),

  activity: (limit = 10, agentAddress = AGENT_ADDRESS) =>
    get<ActivityResponse>("/activity", {
      agentAddress,
      limit: String(limit),
    }),

  walletMe: (token: string) =>
    get<WalletMeResponse>("/wallet/me", undefined, token),

  budget: () =>
    get<BudgetResponse>("/budget", { agentAddress: AGENT_ADDRESS }),

  agentStatus: () =>
    get<AgentStatusResponse>("/agent/status"),

  agentTick: () =>
    post<{ action: string; result?: unknown; reason?: string }>("/agent/tick"),

  vaultApy: (vaultId: string, agentAddress = AGENT_ADDRESS) =>
    get<VaultApyResponse>("/vault/apy", { vaultId, agentAddress }),

  vaultDeposit: (vaultId: string, amount: string, token: string) =>
    post<{ txHash: string; sharesReceived: string; currentAPY: string }>(
      "/vault/deposit",
      { vaultId, amount, agentAddress: AGENT_ADDRESS },
      token
    ),

  vaultWithdraw: (vaultId: string, shares: string, token: string) =>
    post<{ txHash: string; amountReceived: string; yieldEarned: string }>(
      "/vault/withdraw",
      { vaultId, shares, agentAddress: AGENT_ADDRESS },
      token
    ),
};
