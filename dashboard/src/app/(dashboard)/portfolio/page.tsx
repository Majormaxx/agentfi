// Build: 2026-04-21T00:50
"use client";

import { useEffect, useState, useCallback } from "react";
import { Coins, Landmark, TrendingUp, ArrowDownToLine, Plus, RefreshCw, X, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { api, AGENT_ADDRESS, type PositionsResponse, type VaultApyResponse } from "@/lib/api";
import { useToast } from "@/components/Toast";

const VAULT_ID_USDC = "defindex-blend-usdc-v1";
const VAULT_ID_XLM  = "defindex-blend-xlm-v1";

type DepositStrategy = "xlm-direct" | "swap-usdc";

// ── Deposit modal ──────────────────────────────────────────────────────────────
function DepositModal({
  xlm, apy, agentAddress, onClose, onSuccess, getToken, authenticated, login,
}: {
  xlm: number; apy: VaultApyResponse | null; agentAddress: string;
  onClose: () => void; onSuccess: () => void;
  getToken: () => Promise<string | null>; authenticated: boolean; login: () => void;
}) {
  const [amount,   setAmount]   = useState("");
  const [working,  setWorking]  = useState(false);
  const [strategy, setStrategy] = useState<DepositStrategy>("xlm-direct");
  const toast = useToast();

  const handleConfirm = async () => {
    if (!authenticated) { login(); return; }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { toast.show("Enter a valid amount", "warning"); return; }
    if (amountNum > xlm) { toast.show("Amount exceeds your XLM balance", "warning"); return; }
    setWorking(true);
    try {
      const token = await getToken();
      if (!token) { login(); return; }
      const stroops = String(Math.floor(amountNum * 1e7));

      if (strategy === "xlm-direct") {
        // Direct deposit: XLM → XLM vault
        await api.vaultDeposit(VAULT_ID_XLM, stroops, token, agentAddress);
        toast.show(`Deposited ${amountNum} XLM into XLM vault!`, "success");
      } else {
        // Swap + deposit: XLM → USDC → USDC vault (two live testnet txs)
        await api.vaultSwapAndDeposit(
          "XLM:native", stroops, 1.0, VAULT_ID_USDC, token, agentAddress,
        );
        toast.show(`Swapped ${amountNum} XLM to USDC and deposited into vault!`, "success");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.show(err instanceof Error ? err.message : "Deposit failed", "error");
    } finally {
      setWorking(false);
    }
  };

  const xlmUsdEstimate = parseFloat(amount || "0") * 0.10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Move to Savings Vault</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Strategy selector */}
        <div className="flex gap-2">
          {([
            { key: "xlm-direct" as const, label: "XLM Vault", desc: "Direct deposit" },
            { key: "swap-usdc" as const, label: "USDC Vault", desc: "Auto-swap + deposit" },
          ]).map(({ key, label, desc }) => (
            <button key={key} onClick={() => setStrategy(key)}
              className="flex-1 py-2.5 px-3 rounded-xl text-left transition-all duration-150"
              style={{
                background: strategy === key ? "rgba(0,200,150,0.1)" : "var(--color-bg)",
                border: `1.5px solid ${strategy === key ? "rgba(0,200,150,0.4)" : "var(--color-border)"}`,
              }}>
              <p className="text-xs font-semibold" style={{ color: strategy === key ? "#00C896" : "var(--color-text)" }}>
                {label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>{desc}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Amount (XLM)</label>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
            <input
              type="number" placeholder="0" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-lg font-semibold outline-none"
              style={{ color: "var(--color-text)" }}
            />
            <button onClick={() => setAmount(xlm.toFixed(2))}
              className="text-xs font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(0,200,150,0.12)", color: "var(--color-earn)" }}>
              MAX
            </button>
          </div>
          {parseFloat(amount) > 0 && strategy === "swap-usdc" && (
            <p className="text-xs pl-1" style={{ color: "var(--color-muted)" }}>
              &#8776; ${xlmUsdEstimate.toFixed(2)} USDC after swap (est.)
            </p>
          )}
        </div>

        {apy && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
            <div>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {strategy === "xlm-direct" ? "DeFindex Blend XLM" : "DeFindex Blend USDC"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                ${(parseInt(apy.tvl) / 1e7).toLocaleString("en-US", { maximumFractionDigits: 0 })}k TVL
                &middot; {(apy.utilizationRate * 100).toFixed(0)}% utilised &middot; testnet
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-lg font-bold" style={{ color: "var(--color-earn)" }}>{apy.currentAPY.toFixed(1)}%</p>
              <p className="text-[10px]" style={{ color: "var(--color-earn)" }}>APY</p>
            </div>
          </div>
        )}

        {strategy === "swap-usdc" && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ background: "rgba(59,130,246,0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#3B82F6" }} />
            <span style={{ color: "#3B82F6" }}>
              XLM will be swapped to USDC via Soroswap before depositing
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: authenticated ? "rgba(0,200,150,0.08)" : "rgba(249,115,22,0.08)" }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: authenticated ? "var(--color-earn)" : "var(--color-spend)" }} />
          <span style={{ color: authenticated ? "var(--color-earn)" : "var(--color-spend)" }}>
            {authenticated ? "Signed in. Agent wallet ready." : "Sign in to authorize"}
          </span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={working}
            className="flex-1 py-3 rounded-xl text-sm font-medium hover:opacity-70 transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={working}
            className="flex-1 py-3 rounded-xl text-sm font-semibold hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-earn)", color: "#fff" }}>
            {working ? <><Loader2 size={14} className="animate-spin" /> {strategy === "swap-usdc" ? "Swapping..." : "Depositing..."}</> : authenticated ? "Confirm \u2192" : "Sign in \u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Withdraw modal ─────────────────────────────────────────────────────────────
function WithdrawModal({
  vaultValue, agentAddress, onClose, onSuccess, getToken, authenticated, login,
}: {
  vaultValue: number; agentAddress: string;
  onClose: () => void; onSuccess: () => void;
  getToken: () => Promise<string | null>; authenticated: boolean; login: () => void;
}) {
  const [amount,  setAmount]  = useState("");
  const [working, setWorking] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    if (!authenticated) { login(); return; }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) { toast.show("Enter a valid amount", "warning"); return; }
    setWorking(true);
    try {
      const token = await getToken();
      if (!token) { login(); return; }
      const shares = String(Math.floor(amountNum * 1e7));
      await api.vaultWithdraw(VAULT_ID_USDC, shares, token, agentAddress);
      toast.show(`Withdrew $${amountNum} from savings vault!`, "success");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.show(err instanceof Error ? err.message : "Withdrawal failed", "error");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-t-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Withdraw from Savings</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70" style={{ color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Amount (USDC)</label>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
            <input
              type="number" placeholder="0" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-lg font-semibold outline-none"
              style={{ color: "var(--color-text)" }}
            />
            <button onClick={() => setAmount(vaultValue.toFixed(2))}
              className="text-xs font-semibold px-2 py-0.5 rounded-lg"
              style={{ background: "rgba(0,200,150,0.12)", color: "var(--color-earn)" }}>
              MAX
            </button>
          </div>
          <p className="text-xs pl-1" style={{ color: "var(--color-muted)" }}>
            Available: ${vaultValue.toFixed(2)} USDC
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: authenticated ? "rgba(0,200,150,0.08)" : "rgba(249,115,22,0.08)" }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: authenticated ? "var(--color-earn)" : "var(--color-spend)" }} />
          <span style={{ color: authenticated ? "var(--color-earn)" : "var(--color-spend)" }}>
            {authenticated ? "Signed in. Agent wallet ready." : "Sign in to authorize"}
          </span>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={working}
            className="flex-1 py-3 rounded-xl text-sm font-medium hover:opacity-70 transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-muted)" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={working}
            className="flex-1 py-3 rounded-xl text-sm font-semibold hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "var(--color-spend)", color: "#fff" }}>
            {working ? <><Loader2 size={14} className="animate-spin" /> Withdrawing…</> : authenticated ? "Withdraw →" : "Sign in →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const { getAccessToken, authenticated, login } = usePrivy();
  const [userAddress,  setUserAddress]  = useState<string | null>(null);
  const [positions,    setPositions]    = useState<PositionsResponse | null>(null);
  const [apy,          setApy]          = useState<VaultApyResponse | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Provision (or retrieve) the user's personal Stellar wallet on login
  useEffect(() => {
    if (!authenticated) return;
    getAccessToken().then((token) => {
      if (!token) return;
      api.walletMe(token)
        .then((w) => setUserAddress(w.stellarAddress))
        .catch(() => {});
    });
  }, [authenticated, getAccessToken]);

  const agentAddress = userAddress ?? AGENT_ADDRESS;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, apyData] = await Promise.all([
        api.positions(agentAddress),
        api.vaultApy(VAULT_ID_USDC, agentAddress),
      ]);
      setPositions(pos);
      setApy(apyData);
    } catch { /* backend offline, keep stale data */ }
    finally { setLoading(false); }
  }, [agentAddress]);

  useEffect(() => { refresh(); }, [refresh]);

  const usdc       = positions ? parseFloat(positions.walletBalance.USDC) : 0;
  const xlm        = positions ? parseFloat(positions.walletBalance.XLM)  : 0;
  const vault      = positions?.vaultPositions[0] ?? null;
  const vaultValue = vault ? parseFloat(vault.currentValue) : 0;
  const yieldAmt   = vault ? parseFloat(vault.unrealizedYield) : 0;
  const total      = positions ? parseFloat(positions.totalValueUSDC) : 0;
  const allocPct   = total > 0 ? Math.round((vaultValue / total) * 100) : 0;
  // XLM→USDC estimate: back-calculated from backend totalValueUSDC when possible
  const xlmInUsdc  = total > 0 && usdc >= 0 ? Math.max(0, total - usdc - vaultValue) : xlm * 0.10;

  return (
    <>
      {showDeposit && (
        <DepositModal xlm={xlm} apy={apy} agentAddress={agentAddress}
          onClose={() => setShowDeposit(false)} onSuccess={refresh}
          getToken={getAccessToken} authenticated={authenticated} login={login} />
      )}
      {showWithdraw && (
        <WithdrawModal vaultValue={vaultValue} agentAddress={agentAddress}
          onClose={() => setShowWithdraw(false)} onSuccess={refresh}
          getToken={getAccessToken} authenticated={authenticated} login={login} />
      )}

      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Portfolio</h1>
          <button onClick={refresh} disabled={loading}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <RefreshCw size={13} strokeWidth={2} className={loading ? "animate-spin" : ""}
              style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        {/* Spending account */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,150,0.12)" }}>
              <Coins size={16} color="var(--color-earn)" strokeWidth={2} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
              Spending Account
            </span>
          </div>

          {loading ? (
            <>
              <div className="skeleton h-8 w-32 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    ${usdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>USDC</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-semibold">
                    {xlm.toLocaleString("en-US", { maximumFractionDigits: 2 })} XLM
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                    ≈ ${xlmInUsdc.toFixed(2)} <span style={{ opacity: 0.6 }}>(est.)</span>
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                <div className="h-full rounded-full" style={{ width: `${allocPct}%`, background: "var(--gradient-earn)" }} />
              </div>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {allocPct > 0 ? `${allocPct}% allocated to savings` : "0% in savings. Move funds to start earning."}
              </p>
            </>
          )}
        </div>

        {/* Savings vault */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Savings Vault</h2>
          <div className="card flex flex-col gap-4">
            {loading ? (
              <>
                <div className="skeleton h-20 w-full rounded-xl" />
                <div className="skeleton h-10 w-full rounded-xl" />
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
                      style={{ background: "rgba(59,130,246,0.12)" }}>
                      <Landmark size={15} color="#3B82F6" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>
                        {vault?.vaultId ?? "DeFindex Blend USDC"}
                      </p>
                      <p className="text-xl font-semibold mt-0.5 tracking-tight">
                        ${vaultValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>current value</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center px-3 py-1.5 rounded-xl"
                    style={{ background: "rgba(0,200,150,0.1)" }}>
                    <TrendingUp size={14} color="var(--color-earn)" strokeWidth={2.5} />
                    <p className="text-lg font-bold leading-none mt-1" style={{ color: "var(--color-earn)" }}>
                      {apy ? `${apy.currentAPY.toFixed(1)}%` : "..."}
                    </p>
                    <p className="text-[10px] font-medium" style={{ color: "var(--color-earn)" }}>APY</p>
                  </div>
                </div>

                {apy && (
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    DeFindex · ${(parseInt(apy.tvl) / 1e7).toLocaleString("en-US", { maximumFractionDigits: 0 })}k TVL
                    · {(apy.utilizationRate * 100).toFixed(0)}% utilised · testnet
                  </p>
                )}

                <div className="pt-3 border-t flex items-center justify-between"
                  style={{ borderColor: "var(--color-border)" }}>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-muted)" }}>Unrealized yield</p>
                    <p className="text-base font-semibold" style={{ color: "var(--color-earn)" }}>
                      +${yieldAmt.toFixed(4)}
                    </p>
                  </div>
                  <button onClick={() => setShowWithdraw(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-80 active:scale-95"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <ArrowDownToLine size={14} strokeWidth={2} />
                    Withdraw
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <button onClick={() => setShowDeposit(true)}
          className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:opacity-80 active:scale-[0.98] border-2 border-dashed"
          style={{ borderColor: "var(--color-earn)", color: "var(--color-earn)" }}>
          <Plus size={16} strokeWidth={2.5} />
          Move more to savings
        </button>

        <details className="card text-xs" style={{ color: "var(--color-muted)" }}>
          <summary className="cursor-pointer font-medium list-none flex items-center justify-between">
            <span>Advanced</span><span className="text-base">›</span>
          </summary>
          <div className="mt-3 flex flex-col gap-1.5 font-mono">
            {apy && <p>Strategy: {apy.strategy}</p>}
            {apy && <p>TVL: {parseInt(apy.tvl).toLocaleString()} stroops</p>}
            {apy && <p>Utilization: {(apy.utilizationRate * 100).toFixed(0)}%</p>}
            {vault && <p>Shares: {vault.shares}</p>}
            {userAddress && <p>Your wallet: {userAddress.slice(0, 8)}…{userAddress.slice(-6)}</p>}
            <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: "var(--color-earn)" }}>
              View on Stellar Explorer →
            </a>
          </div>
        </details>
      </div>
    </>
  );
}
