/**
 * AgentLoopService — the AI brain of AgentFi.
 *
 * Every LOOP_INTERVAL_MS the agent:
 *   1. Fetches real wallet balances from Horizon + vault positions from SQLite
 *   2. Fetches live APY for all known vaults
 *   3. Sends the full state to Groq (Llama 3.3 70B) with tool definitions
 *   4. Llama executes ONE of: auto_deposit, compound, apy_floor_exit, swap, hold
 *   5. Records the action + updates SQLite
 *
 * Agentic behaviors (all thresholds env-configurable):
 *   - AUTO-DEPOSIT:     idle USDC > AGENT_MIN_AUTO_DEPOSIT_USDC → deposit into vault
 *   - AUTO-COMPOUND:    unrealized yield > AGENT_COMPOUND_THRESHOLD_USDC → compound
 *   - APY-FLOOR EXIT:   vault APY < AGENT_APY_FLOOR_PCT → withdraw and wait
 *   - REBALANCE/SHIFT:  higher-APY vault available (gap > 0.5%) → shift capital
 *
 * Hard constraints enforced before any tool call:
 *   - Daily USDC spend cap (from agent_budgets table)
 */

import Groq from "groq-sdk";
import { config } from "../config.js";
import { SwapService }      from "./SwapService.js";
import { VaultService }     from "./VaultService.js";
import { RebalanceService } from "./RebalanceService.js";
import {
  getDb,
  recordTransaction,
  getVaultPositions,
  upsertVaultPosition,
  removeVaultPosition,
} from "../db/database.js";
import { recordSpend }       from "../middleware/budget.js";
import { getAccountBalances } from "../lib/stellar.js";
import { v4 as uuidv4 }      from "uuid";

// ── Constants ─────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 5 * 60 * 1000;
const MODEL            = "llama-3.3-70b-versatile";

// ── Tool definitions (Groq function-calling format) ───────────────────────────

const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "swap",
      description: "Swap one token for another using the best available DEX route (Soroswap, Phoenix, Aqua, SDEX). Use when you want to change token allocation.",
      parameters: {
        type: "object",
        properties: {
          tokenIn:  { type: "string", description: "Source token, e.g. 'XLM:native' or 'USDC:CONTRACT'" },
          tokenOut: { type: "string", description: "Destination token" },
          amountIn: { type: "string", description: "Amount in stroops (1 XLM = 10,000,000 stroops)" },
          slippage: { type: "number", description: "Max acceptable slippage percent, e.g. 0.5" },
        },
        required: ["tokenIn", "tokenOut", "amountIn", "slippage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vault_deposit",
      description: "Deposit USDC into a DeFindex yield vault to start earning interest. Use for auto-deposit when wallet has idle USDC and no active vault position.",
      parameters: {
        type: "object",
        properties: {
          vaultId: { type: "string", description: "Vault ID: 'defindex-blend-usdc-v1' or 'defindex-blend-xlm-v1'" },
          amount:  { type: "string", description: "Amount in stroops to deposit" },
        },
        required: ["vaultId", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vault_withdraw",
      description: "Withdraw shares from a DeFindex yield vault. Use when APY has dropped below the floor threshold.",
      parameters: {
        type: "object",
        properties: {
          vaultId: { type: "string", description: "Vault ID to withdraw from" },
          shares:  { type: "string", description: "Number of vault shares to redeem" },
        },
        required: ["vaultId", "shares"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rebalance",
      description: "Compound earned yield back into a vault (action='compound') or shift funds between vaults (action='shift') to chase higher APY.",
      parameters: {
        type: "object",
        properties: {
          action:      { type: "string", enum: ["compound", "shift"] },
          sourceVault: { type: "string", description: "Vault to compound or shift out of" },
          targetVault: { type: "string", description: "Required for shift: vault to shift into" },
          amount:      { type: "string", description: "Required for shift: stroops to move" },
        },
        required: ["action", "sourceVault"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "hold",
      description: "Take no action this cycle. Use when no rule is triggered and conditions don't justify a trade.",
      parameters: { type: "object", properties: { reason: { type: "string" } }, required: ["reason"] },
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

interface BudgetRow {
  daily_limit_usdc: number;
  spent_today_usdc: number;
}

function getBudget(agentAddress: string): BudgetRow {
  const db  = getDb();
  const row = db.prepare("SELECT daily_limit_usdc, spent_today_usdc FROM agent_budgets WHERE agent_address = ?")
                .get(agentAddress) as BudgetRow | undefined;
  return row ?? { daily_limit_usdc: 10, spent_today_usdc: 0 };
}

function logAgentAction(agentAddress: string, action: string, detail: string, result?: unknown) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO activity_log
      (id, agent_address, type, message, amount_usdc, tx_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(uuidv4(), agentAddress, action, detail, null, (result as { txHash?: string })?.txHash ?? null);
  console.log(`[AgentLoop] ${action}: ${detail}`);
}

// ── Main service ──────────────────────────────────────────────────────────────

export class AgentLoopService {
  private groq           = new Groq({ apiKey: config.groqApiKey });
  private swapService    = new SwapService();
  private vaultService   = new VaultService();
  private rebalance      = new RebalanceService();
  private timer: ReturnType<typeof setInterval> | null = null;
  private running        = false;
  private paused         = false;
  private lastDecision:  { action: string; reason: string; tickedAt: string } | null = null;
  private nextTickAt:    Date | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  getLastDecision() { return this.lastDecision; }
  getNextTickAt()   { return this.nextTickAt?.toISOString() ?? null; }
  isRunning()       { return this.timer !== null && !this.paused; }
  isPaused()        { return this.paused; }

  start() {
    if (this.timer) return;
    this.paused = false;
    console.log("[AgentLoop] Starting — interval:", LOOP_INTERVAL_MS / 1000, "s");
    this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
    this.tick().catch(console.error);
    this.timer = setInterval(() => {
      this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
      this.tick().catch(console.error);
    }, LOOP_INTERVAL_MS);
  }

  pause() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.paused = true;
    this.nextTickAt = null;
    console.log("[AgentLoop] Paused.");
  }

  resume() {
    if (this.timer) return;
    this.paused = false;
    this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
    this.timer = setInterval(() => {
      this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
      this.tick().catch(console.error);
    }, LOOP_INTERVAL_MS);
    console.log("[AgentLoop] Resumed.");
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.paused = false;
    console.log("[AgentLoop] Stopped.");
  }

  /** Run a single decision cycle (also exposed for manual trigger via API). */
  async tick(): Promise<{ action: string; result?: unknown; reason?: string }> {
    if (this.running) return { action: "skipped", reason: "previous tick still running" };
    this.running = true;
    try {
      const result = await this._decide();
      this.lastDecision = {
        action:   result.action,
        reason:   (result.reason as string) ?? "",
        tickedAt: new Date().toISOString(),
      };
      return result;
    } finally {
      this.running = false;
    }
  }

  // ── Decision loop ──────────────────────────────────────────────────────────

  private async _decide(): Promise<{ action: string; result?: unknown; reason?: string }> {
    const agentAddress = config.agentfiAddress;
    if (!agentAddress) throw new Error("AGENTFI_STELLAR_ADDRESS not set");

    // 1. Check budget first — skip tick if exhausted
    const budget          = getBudget(agentAddress);
    const remainingBudget = budget.daily_limit_usdc - budget.spent_today_usdc;
    if (remainingBudget <= 0) {
      const reason = `Daily budget exhausted ($${budget.spent_today_usdc.toFixed(2)} / $${budget.daily_limit_usdc.toFixed(2)})`;
      logAgentAction(agentAddress, "hold", reason);
      return { action: "hold", reason };
    }

    // 2. Fetch real wallet balances from Horizon (non-fatal if offline)
    let usdcBalanceUsdc = 0;
    let xlmBalanceXlm   = 0;
    try {
      const balances  = await getAccountBalances(agentAddress);
      usdcBalanceUsdc = parseInt(balances.USDC) / 1e7;
      xlmBalanceXlm   = parseInt(balances.XLM)  / 1e7;
    } catch (err) {
      console.warn("[AgentLoop] Horizon balance fetch failed:", (err as Error).message);
    }

    // 3. Fetch vault positions from DB with live yield calculation
    const rawPositions = getVaultPositions(agentAddress);
    const positionSummaries = rawPositions.map((pos) => {
      const deposited      = parseFloat(pos["deposited_amount"] as string) / 1e7;
      const apy            = (pos["last_apy_check"] as number | null) ?? 0;
      const elapsed        = (Date.now() - new Date(pos["deposited_at"] as string).getTime()) / 1000;
      const currentValue   = deposited * (1 + (apy / 100) * (elapsed / 31_536_000));
      const unrealizedYield = Math.max(0, currentValue - deposited);
      return {
        vaultId:              pos["vault_id"]  as string,
        shares:               pos["shares"]    as string,
        depositedUsdc:        deposited.toFixed(4),
        unrealizedYieldUsdc:  unrealizedYield.toFixed(6),
        currentApy:           apy,
      };
    });

    // 4. Fetch live APY for both vaults in parallel
    const [usdcApyResult, xlmApyResult] = await Promise.allSettled([
      this.vaultService.getApy(config.vaults.usdcId),
      this.vaultService.getApy(config.vaults.xlmId),
    ]);

    const usdcApyValue = usdcApyResult.status === "fulfilled" ? usdcApyResult.value.currentAPY : null;
    const xlmApyValue  = xlmApyResult.status  === "fulfilled" ? xlmApyResult.value.currentAPY  : null;

    // 5. Compute thresholds from env-driven config
    const {
      apyFloorPct,
      compoundYieldThresholdUsdc,
      minAutoDepositUsdc,
      depositReserveFraction,
    } = config.agentBehavior;

    const hasUsdcPosition  = positionSummaries.some(p => p.vaultId === config.vaults.usdcId);
    const depositableStroops = Math.floor(usdcBalanceUsdc * (1 - depositReserveFraction) * 1e7).toString();

    // 6. Build enriched system prompt
    const positionBlock = positionSummaries.length === 0
      ? "  No active vault positions."
      : positionSummaries.map(p =>
          `  - ${p.vaultId}: deposited ${p.depositedUsdc} USDC, unrealized yield ${p.unrealizedYieldUsdc} USDC, APY ${p.currentApy}%, shares ${p.shares}`
        ).join("\n");

    const marketBlock = [
      usdcApyValue !== null ? `  - ${config.vaults.usdcId}: ${usdcApyValue}% APY` : `  - ${config.vaults.usdcId}: APY unavailable`,
      xlmApyValue  !== null ? `  - ${config.vaults.xlmId}: ${xlmApyValue}% APY`  : `  - ${config.vaults.xlmId}: APY unavailable`,
    ].join("\n");

    const systemPrompt = `You are an autonomous DeFi yield agent managing a Stellar wallet.
Your sole objective: put capital to work efficiently, compound gains, and protect against low-yield environments.

WALLET STATE:
  USDC balance: ${usdcBalanceUsdc.toFixed(4)} USDC
  XLM balance:  ${xlmBalanceXlm.toFixed(4)} XLM

VAULT POSITIONS:
${positionBlock}

LIVE VAULT APY:
${marketBlock}

DAILY BUDGET: $${budget.daily_limit_usdc.toFixed(2)} limit — $${remainingBudget.toFixed(2)} remaining today.

BEHAVIORAL RULES (evaluate in order, execute the FIRST rule that applies):

RULE 1 — AUTO-DEPOSIT:
  Condition: USDC balance >= ${minAutoDepositUsdc} USDC AND no active position in ${config.vaults.usdcId}
  Action: vault_deposit(vaultId="${config.vaults.usdcId}", amount="${depositableStroops}")
  Currently applies: ${usdcBalanceUsdc >= minAutoDepositUsdc && !hasUsdcPosition ? "YES" : "NO"}

RULE 2 — AUTO-COMPOUND:
  Condition: any vault position has unrealizedYieldUsdc >= ${compoundYieldThresholdUsdc}
  Action: rebalance(action="compound", sourceVault=<that vault's vaultId>)
  Currently applies: ${positionSummaries.some(p => parseFloat(p.unrealizedYieldUsdc) >= compoundYieldThresholdUsdc) ? "YES" : "NO"}

RULE 3 — APY-FLOOR EXIT:
  Condition: an active vault position's current APY < ${apyFloorPct}%
  Action: vault_withdraw(vaultId=<that vault>, shares=<all shares in that position>)
  Currently applies: ${positionSummaries.some(p => p.currentApy < apyFloorPct && p.currentApy > 0) ? "YES" : "NO"}

RULE 4 — REBALANCE/SHIFT:
  Condition: you hold a vault position AND another vault offers APY > current vault APY + 0.5%
  Action: rebalance(action="shift", sourceVault=<lower APY vault>, targetVault=<higher APY vault>, amount=<shares>)

RULE 5 — HOLD:
  Condition: none of the above apply
  Action: hold(reason="<specific reason why no action is needed right now>")

Network: Stellar ${config.stellarNetwork}
Agent wallet: ${agentAddress}

Respond with exactly ONE tool call. No text outside the tool call.`;

    // 7. Ask Groq
    const response = await this.groq.chat.completions.create({
      model:        MODEL,
      messages:     [{ role: "system", content: systemPrompt }],
      tools:        TOOLS,
      tool_choice:  "required",
      temperature:  0.1,
      max_tokens:   512,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      logAgentAction(agentAddress, "hold", "No tool call returned by model");
      return { action: "hold", reason: "no tool call" };
    }

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      logAgentAction(agentAddress, "error", `Bad JSON from model: ${toolCall.function.arguments}`);
      return { action: "error", reason: "invalid tool arguments" };
    }

    return this._execute(agentAddress, toolCall.function.name, args);
  }

  // ── Tool execution ─────────────────────────────────────────────────────────

  private async _execute(
    agentAddress: string,
    fnName: string,
    args: Record<string, unknown>
  ): Promise<{ action: string; result?: unknown; reason?: string }> {

    switch (fnName) {

      case "swap": {
        const result = await this.swapService.execute({
          tokenIn:      args.tokenIn  as string,
          tokenOut:     args.tokenOut as string,
          amountIn:     args.amountIn as string,
          slippage:     args.slippage as number,
          agentAddress,
        });
        const msg = `Swapped ${args.amountIn} ${args.tokenIn} to ${args.tokenOut} via ${result.protocol}`;
        logAgentAction(agentAddress, "trade", msg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/swap", "x402", 0.002, result.txHash, undefined, args, result);
        recordSpend(agentAddress, 0.002);
        return { action: "swap", result, reason: msg };
      }

      case "vault_deposit": {
        const result = await this.vaultService.deposit({
          vaultId:      args.vaultId as string,
          amount:       args.amount  as string,
          agentAddress,
        });
        const msg = `Deposited ${args.amount} stroops into ${args.vaultId} at ${result.currentAPY}% APY`;
        logAgentAction(agentAddress, "savings", msg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/vault_deposit", "x402", 0.001, result.txHash, undefined, args, result);
        recordSpend(agentAddress, 0.001);
        // Keep DB position in sync
        upsertVaultPosition(uuidv4(), agentAddress, args.vaultId as string, result.sharesReceived, args.amount as string, parseFloat(result.currentAPY));
        return { action: "vault_deposit", result, reason: msg };
      }

      case "vault_withdraw": {
        const result = await this.vaultService.withdraw({
          vaultId:      args.vaultId as string,
          shares:       args.shares  as string,
          agentAddress,
        });
        const msg = `Withdrew ${result.amountReceived} stroops from ${args.vaultId}, yield earned: ${result.yieldEarned}`;
        logAgentAction(agentAddress, "savings", msg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/vault_withdraw", "x402", 0.001, result.txHash, undefined, args, result);
        recordSpend(agentAddress, 0.001);
        // Remove position so auto-deposit can trigger again after re-evaluation
        removeVaultPosition(agentAddress, args.vaultId as string);
        return { action: "vault_withdraw", result, reason: msg };
      }

      case "rebalance": {
        const result = await this.rebalance.rebalance({
          agentAddress,
          action:      args.action      as "compound" | "shift",
          sourceVault: args.sourceVault as string,
          targetVault: args.targetVault as string | undefined,
          amount:      args.amount      as string | undefined,
        });
        logAgentAction(agentAddress, "interest", result.message, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/rebalance", "x402", 0.003, result.txHash, undefined, args, result);
        recordSpend(agentAddress, 0.003);
        return { action: "rebalance", result, reason: result.message };
      }

      case "hold": {
        const reason = (args.reason as string) ?? "No action needed";
        logAgentAction(agentAddress, "hold", reason);
        return { action: "hold", reason };
      }

      default:
        logAgentAction(agentAddress, "error", `Unknown tool: ${fnName}`);
        return { action: "error", reason: `unknown tool: ${fnName}` };
    }
  }
}
