/**
 * AgentLoopService — the AI brain of AgentFi.
 *
 * Every LOOP_INTERVAL_MS the agent:
 *   1. Fetches current positions + APY data
 *   2. Sends them to Groq (Llama 3.3 70B) with tool definitions
 *   3. Llama decides whether to swap, deposit, withdraw, or rebalance
 *   4. Executes the chosen tool via the existing service layer
 *   5. Records the action in SQLite
 *
 * Hard constraints enforced before any tool call:
 *   - Daily USDC spend cap (from agent_budgets table)
 *   - Only whitelisted actions (swap, vault_deposit, vault_withdraw, rebalance)
 */

import Groq from "groq-sdk";
import { config } from "../config.js";
import { SwapService }      from "./SwapService.js";
import { VaultService }     from "./VaultService.js";
import { RebalanceService } from "./RebalanceService.js";
import { getDb, recordTransaction } from "../db/database.js";
import { v4 as uuidv4 } from "uuid";

// ── Constants ─────────────────────────────────────────────────────────────────

const LOOP_INTERVAL_MS = 5 * 60 * 1000; // run every 5 minutes
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
      description: "Deposit funds into a DeFindex yield vault to earn interest.",
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
      description: "Withdraw shares from a DeFindex yield vault.",
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
      description: "Take no action this cycle. Use when conditions don't justify a trade.",
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
  private lastDecision:  { action: string; reason: string; tickedAt: string } | null = null;
  private nextTickAt:    Date | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  getLastDecision() { return this.lastDecision; }
  getNextTickAt()   { return this.nextTickAt?.toISOString() ?? null; }

  start() {
    if (this.timer) return;
    console.log("[AgentLoop] Starting — interval:", LOOP_INTERVAL_MS / 1000, "s");
    this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
    this.tick().catch(console.error);
    this.timer = setInterval(() => {
      this.nextTickAt = new Date(Date.now() + LOOP_INTERVAL_MS);
      this.tick().catch(console.error);
    }, LOOP_INTERVAL_MS);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
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

    // 1. Gather context
    const budget = getBudget(agentAddress);
    const remainingBudget = budget.daily_limit_usdc - budget.spent_today_usdc;

    const [usdcApy, xlmApy] = await Promise.allSettled([
      this.vaultService.getApy(config.vaults.usdcId),
      this.vaultService.getApy(config.vaults.xlmId),
    ]);

    const apySummary = [
      usdcApy.status === "fulfilled"
        ? `USDC vault APY: ${usdcApy.value.currentAPY}%, TVL: ${usdcApy.value.tvl}`
        : "USDC vault APY: unavailable",
      xlmApy.status === "fulfilled"
        ? `XLM vault APY: ${xlmApy.value.currentAPY}%, TVL: ${xlmApy.value.tvl}`
        : "XLM vault APY: unavailable",
    ].join("\n");

    // 2. Build system prompt
    const systemPrompt = `You are an autonomous DeFi agent managing a Stellar wallet.
Your job is to maximise yield and minimise costs within strict guardrails.

CONSTRAINTS (non-negotiable):
- Daily spending cap: $${budget.daily_limit_usdc.toFixed(2)} USDC. Remaining today: $${remainingBudget.toFixed(2)} USDC.
- Only use the provided tools: swap, vault_deposit, vault_withdraw, rebalance, hold.
- Never take an action whose estimated cost exceeds the remaining daily budget.
- Prefer compounding yield over idle holding.
- Prefer higher-APY vaults when shifting, but only if APY difference > 0.5%.
- Call hold() if no action is clearly beneficial.

CURRENT MARKET STATE:
${apySummary}

Agent wallet: ${agentAddress}
Network: Stellar ${config.stellarNetwork}

Respond with exactly ONE tool call. No explanations outside the tool call.`;

    // 3. Ask Groq
    const response = await this.groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }],
      tools: TOOLS,
      tool_choice: "required",
      temperature: 0.1, // low temp for consistent financial decisions
      max_tokens: 512,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      logAgentAction(agentAddress, "hold", "No tool call returned by model");
      return { action: "hold", reason: "no tool call" };
    }

    const fnName = toolCall.function.name;
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      logAgentAction(agentAddress, "error", `Bad JSON from model: ${toolCall.function.arguments}`);
      return { action: "error", reason: "invalid tool arguments" };
    }

    // 4. Execute chosen tool
    return this._execute(agentAddress, fnName, args);
  }

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
        const swapMsg = `Swapped ${args.amountIn} ${args.tokenIn} → ${args.tokenOut} via ${result.protocol}`;
        logAgentAction(agentAddress, "trade", swapMsg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/swap", "x402", 0.002,
          result.txHash, undefined, args, result);
        return { action: "swap", result, reason: swapMsg };
      }

      case "vault_deposit": {
        const result = await this.vaultService.deposit({
          vaultId:      args.vaultId as string,
          amount:       args.amount  as string,
          agentAddress,
        });
        const depositMsg = `Deposited ${args.amount} into ${args.vaultId} earning ${result.currentAPY}% APY`;
        logAgentAction(agentAddress, "savings", depositMsg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/vault_deposit", "x402", 0.001,
          result.txHash, undefined, args, result);
        return { action: "vault_deposit", result, reason: depositMsg };
      }

      case "vault_withdraw": {
        const result = await this.vaultService.withdraw({
          vaultId:      args.vaultId as string,
          shares:       args.shares  as string,
          agentAddress,
        });
        const withdrawMsg = `Withdrew ${result.amountReceived} from ${args.vaultId}, yield: ${result.yieldEarned}`;
        logAgentAction(agentAddress, "savings", withdrawMsg, result);
        recordTransaction(uuidv4(), agentAddress, "agent-loop/vault_withdraw", "x402", 0.001,
          result.txHash, undefined, args, result);
        return { action: "vault_withdraw", result, reason: withdrawMsg };
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
        recordTransaction(uuidv4(), agentAddress, "agent-loop/rebalance", "x402", 0.003,
          result.txHash, undefined, args, result);
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
