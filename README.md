# AgentFi

**DeFi for the agent economy.**

[![License: MIT](https://img.shields.io/badge/License-MIT-00C896.svg)](LICENSE)
[![Network: Stellar Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-7C3AED.svg)](https://stellar.org)
[![Node: ≥20](https://img.shields.io/badge/Node-%E2%89%A520-339933.svg)](https://nodejs.org)
[![Protocols: x402 + MPP](https://img.shields.io/badge/Protocols-x402%20%2B%20MPP-F97316.svg)](https://x402.org)

> _Make agents earn, not just spend._

---

## The Problem

Every x402/MPP project on Stellar gives agents a way to **spend** — buy data, pay APIs, swipe virtual cards. None give agents a way to **earn**. An agent with a USDC balance and no yield strategy is bleeding purchasing power to inflation every second it sits idle.

Stellar's DeFi stack (Soroswap, DeFindex, Blend) is production-grade but completely inaccessible to agents. No x402 endpoint exists for swapping tokens. No MPP session can deposit into a yield vault. The infrastructure is there; the agent-facing interface is missing.

## The Solution

AgentFi wraps Stellar-native DeFi protocols behind dual-protocol **(x402 + MPP)** micropayment gates. An agent pays **$0.001–$0.003 USDC per operation** to:

- Get optimal swap quotes aggregated across Soroswap, Phoenix, Aqua, and SDEX
- Execute token swaps on-chain with slippage protection
- Deposit idle stablecoins into DeFindex yield vaults
- Withdraw vault positions and harvest accrued yield
- Query real-time APY data across strategies
- Trigger compound/rebalance operations autonomously

A human operator maintains control via an OpenZeppelin Smart Account with **on-chain spending limits** and **contract whitelists**. A React dashboard visualizes the earn/spend loop in real time — it looks like a banking app, not a block explorer.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  AI AGENT (Claude, GPT, custom)          │
│                                                          │
│  Discovers endpoints → Receives 402/Payment Required     │
│  Signs payment → Resubmits with payment header           │
│  Receives DeFi execution result                          │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────┐
│              LAYER 1: PAYMENT GATEWAY                    │
│                                                          │
│  Express.js + TypeScript                                 │
│  ├── x402 middleware (@x402/express)                     │
│  │   └── Facilitator: OpenZeppelin channels (testnet)   │
│  └── MPP middleware (mppx / Tempo sessions)              │
│                                                          │
│  GET  /swap/quote          → $0.001 USDC                 │
│  POST /swap/execute        → $0.002 USDC                 │
│  POST /vault/deposit       → $0.001 USDC                 │
│  POST /vault/withdraw      → $0.001 USDC                 │
│  GET  /vault/apy           → $0.0005 USDC                │
│  POST /strategy/rebalance  → $0.003 USDC                 │
│  GET  /positions           → $0.0005 USDC                │
│  GET  /health              → free (agent discovery)      │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              LAYER 2: DeFi EXECUTION ENGINE              │
│                                                          │
│  SwapService                                             │
│  ├── @soroswap/sdk — quote(), build(), send()            │
│  └── Aggregation: Soroswap AMM, Phoenix, Aqua, SDEX     │
│                                                          │
│  VaultService                                            │
│  ├── @defindex/sdk — depositToVault(), withdrawFromVault │
│  └── getVaultAPY(), strategy metadata (Blend lending)   │
│                                                          │
│  RebalanceService                                        │
│  ├── Compound: withdraw yield → re-deposit               │
│  └── Shift: exit vault A → enter vault B                 │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         LAYER 3: SMART ACCOUNT (Soroban)                 │
│                                                          │
│  OpenZeppelin Smart Account contract                     │
│  ├── SpendingLimitPolicy  (max $X USDC/day)              │
│  ├── ContractWhitelistPolicy  (Soroswap + DeFindex only) │
│  └── PasskeySigner  (agent identity via WebAuthn)        │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│      LAYER 4: OPERATOR DASHBOARD (Next.js 14)            │
│                                                          │
│  Auth: email + passkey (no seed phrases, no extensions)  │
│  ├── Home: balance · earned today · agent status         │
│  ├── Portfolio: savings balance · interest earned        │
│  └── Limits: daily cap slider · allowed actions toggle   │
└─────────────────────────────────────────────────────────┘
```

---

## The Earn/Spend Loop

```
Agent deposits $500 USDC into DeFindex vault
         │
         ▼
Vault earns 5.2% APY via Blend lending protocol
         │
         ▼  (daily accrual ≈ $0.07)
Agent calls /strategy/rebalance → compound
         │
         ▼
Yield funds the agent's own API call costs ($0.001–0.003/op)
         │
         ▼
Agent is SELF-SUSTAINING — no human top-ups needed ↗
```

In our demo, the agent's yield income exceeds its operational costs within **48 simulated hours**.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- A funded Stellar testnet account ([friendbot](https://laboratory.stellar.org/#account-creator?network=test))
- USDC on testnet (available via Stellar testnet faucet)

### 1. Clone and install

```bash
git clone https://github.com/Majormaxx/agentfi.git
cd agentfi
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in AGENTFI_STELLAR_ADDRESS and AGENTFI_STELLAR_SECRET
```

### 3. Start the gateway server

```bash
npm run dev
# → AgentFi server running on port 3001 (stellar-testnet)
```

### 4. Start the operator dashboard

```bash
cd dashboard
npm install
npm run dev
# → Dashboard running on http://localhost:3000
```

### 5. Start the MCP server (optional — for Claude Desktop / Cursor)

```bash
npm run mcp
# → AgentFi MCP server v0.1.0 running (stdio)
```

### 6. Verify

```bash
curl http://localhost:3001/health
```

```json
{
  "service": "AgentFi",
  "version": "0.1.0",
  "network": "stellar-testnet",
  "protocols": ["x402", "mpp"],
  "status": "ok"
}
```

---

## API Reference

All endpoints except `/health` require payment via x402 or MPP. In dev mode (no `AGENTFI_STELLAR_SECRET`), gates are bypassed automatically.

| Endpoint              | Method | Price        | Description                                                     |
| --------------------- | ------ | ------------ | --------------------------------------------------------------- |
| `/health`             | GET    | Free         | Service discovery — lists all endpoints, prices, and protocols  |
| `/swap/quote`         | GET    | $0.001 USDC  | Optimal swap route across Soroswap, Phoenix, Aqua, SDEX         |
| `/swap/execute`       | POST   | $0.002 USDC  | Execute swap; returns tx hash and settlement details            |
| `/vault/deposit`      | POST   | $0.001 USDC  | Deposit into DeFindex yield vault; returns shares received      |
| `/vault/withdraw`     | POST   | $0.001 USDC  | Redeem shares; returns principal + accrued yield                |
| `/vault/apy`          | GET    | $0.0005 USDC | Current APY, 7d/30d averages, TVL, utilization rate             |
| `/strategy/rebalance` | POST   | $0.003 USDC  | Compound (harvest + re-deposit) or shift between vaults         |
| `/positions`          | GET    | $0.0005 USDC | Portfolio snapshot: wallet balances, vault positions, net yield |

### Example: Get a swap quote

```bash
curl "http://localhost:3001/swap/quote" \
  -H "X-PAYMENT: <x402-payment-header>" \
  "?tokenIn=USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN\
&tokenOut=XLM:native\
&amountIn=100000000\
&slippage=0.5"
```

```json
{
  "bestRoute": {
    "protocol": "soroswap",
    "path": ["USDC", "XLM"],
    "amountOut": "2341567890",
    "priceImpact": "0.12",
    "minAmountOut": "2329860101",
    "fee": "0.003"
  },
  "alternatives": [
    { "protocol": "phoenix", "amountOut": "2338901234", "priceImpact": "0.15" }
  ],
  "expiresAt": "2026-04-10T12:00:30Z"
}
```

### Example: Deposit into a yield vault

```bash
curl -X POST "http://localhost:3001/vault/deposit" \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <x402-payment-header>" \
  -d '{
    "vaultId": "defindex-blend-usdc-v1",
    "amount": "500000000",
    "token": "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
    "agentAddress": "GCRUB...",
    "signedAuth": "<base64>"
  }'
```

```json
{
  "txHash": "def456...",
  "sharesReceived": "498500000",
  "currentAPY": "5.23",
  "settledAt": "2026-04-10T12:00:40Z"
}
```

### MCP Integration

Add to your Claude Desktop / Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "agentfi": {
      "command": "npx",
      "args": ["tsx", "/path/to/agentfi/mcp-server/index.ts"]
    }
  }
}
```

Available MCP tools: `swap_quote`, `swap_execute`, `vault_deposit`, `vault_apy`, `positions`.

---

## Human Control

AgentFi is autonomous — not uncontrolled. Every DeFi operation is gated by an **OpenZeppelin Smart Account on Soroban** with two mandatory policies:

| Policy                    | What it enforces                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `SpendingLimitPolicy`     | Max USDC/day the agent can spend on DeFi ops. Resets every 24h.                        |
| `ContractWhitelistPolicy` | Only Soroswap router + DeFindex vault contracts can be called. No arbitrary contracts. |

The operator sets these limits from the dashboard using a plain slider and toggle — no smart contract interaction required. If the daily cap is hit, the agent **pauses gracefully** rather than failing or crashing.

---

## Tech Stack

| Layer              | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| Gateway server     | Node.js 20 / TypeScript / Express                     |
| x402 payment       | `@x402/express`, `@x402/stellar`, `@x402/core` v2.9   |
| MPP payment        | `mppx` v0.5 with Tempo sessions                       |
| Swap execution     | `@soroswap/sdk` v0.4                                  |
| Vault execution    | `@defindex/sdk` v0.3                                  |
| Stellar SDK        | `@stellar/stellar-sdk` v15                            |
| Agent data store   | `better-sqlite3` v12                                  |
| MCP server         | `@modelcontextprotocol/sdk` v1.29                     |
| Operator dashboard | Next.js 14 / React 18 / TailwindCSS                   |
| Dashboard auth     | Privy SDK (email + passkey → embedded Stellar wallet) |
| Network            | Stellar Testnet (Soroban RPC)                         |

---

## Error Reference

All errors follow a consistent shape:

```json
{
  "error": "SLIPPAGE_EXCEEDED",
  "message": "Price moved beyond 0.5% tolerance. Try again or increase slippage.",
  "details": { "requestedSlippage": 0.5, "actualSlippage": 0.9 }
}
```

| Code                       | HTTP | Meaning                                            |
| -------------------------- | ---- | -------------------------------------------------- |
| `PAYMENT_REQUIRED`         | 402  | Standard x402/MPP flow — agent must attach payment |
| `INSUFFICIENT_LIQUIDITY`   | 422  | DEX can't fill the order at the requested size     |
| `SLIPPAGE_EXCEEDED`        | 422  | Price moved beyond tolerance before settlement     |
| `BUDGET_EXCEEDED`          | 403  | Smart account daily spending limit reached         |
| `CONTRACT_NOT_WHITELISTED` | 403  | Target contract not in agent's allowlist           |
| `VAULT_PAUSED`             | 503  | DeFindex vault temporarily unavailable             |
| `SETTLEMENT_TIMEOUT`       | 504  | Stellar tx didn't confirm within 30s               |

---

## Roadmap

| Priority | Feature                                              | Status     |
| -------- | ---------------------------------------------------- | ---------- |
| P0       | x402 + MPP gateway with all 8 endpoints              | ✅ Shipped |
| P0       | Next.js dashboard (Home, Portfolio, Limits)          | ✅ Shipped |
| P0       | Soroswap 4-protocol swap aggregation                 | ✅ Shipped |
| P0       | DeFindex vault deposit/withdraw/APY                  | ✅ Shipped |
| P1       | Email + passkey auth via Privy                       | ✅ Shipped |
| P1       | OpenZeppelin Smart Account deployment (Soroban/Rust) | ✅ Shipped |
| P2       | Live Stellar testnet settlement                      | ✅ Shipped |
| P2       | WebSocket real-time dashboard updates                | 📋 Planned |
| P3       | Multi-agent portfolio coordination                   | 📋 Planned |

---

## Demo Flow

1. **Operator signs in** with email + Face ID. No extensions, no seed phrases.
2. **Funds agent** with $100 USDC. Sets daily cap to $10, enables Trade + Savings.
3. **Agent discovers** endpoints via `GET /health`. Pays $0.001, gets swap quote. Pays $0.002, executes USDC→XLM trade.
4. **Agent deposits** $50 idle USDC into savings vault. Dashboard shows: _"Moved $50.00 to savings · 5.2%/yr"_
5. **Yield accrues.** Operator sees home screen: Earned **+$0.07**, Costs **-$0.0045**. Chart turns green. Badge: _"Self-sustaining ↗"_
6. **Guard rails fire.** Agent attempts $15 trade — exceeds $10 cap. Dashboard: _"Daily cap reached · Resets in 14h"_. Agent pauses cleanly.

---

## Contributing

Issues and PRs welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

Built for [Stellar Hacks: Agents](https://dorahacks.io/hackathon/stellar-hacks-agents) · [Drips Stellar Wave 3](https://drips.network)

---

## License

MIT © 2026 Majormaxx
