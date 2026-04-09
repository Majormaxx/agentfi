/**
 * AgentFi MCP Server
 *
 * Exposes AgentFi's DeFi operations as MCP tools so Claude Desktop,
 * Cursor, and other MCP-aware agents can discover and call them natively.
 * Each tool call translates to a paid REST call against the AgentFi gateway.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config, AGENTFI_VERSION } from "../server/config";

const BASE_URL = config.agentfiBaseUrl;

async function callGateway(path: string, method: "GET" | "POST", body?: object): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(method === "GET" && body
    ? `${url}?${new URLSearchParams(body as Record<string, string>)}`
    : url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });

  const data = await res.json() as unknown;
  if (!res.ok) {
    const err = data as { error?: string; message?: string };
    throw new Error(`${err.error ?? "GATEWAY_ERROR"}: ${err.message ?? res.statusText}`);
  }
  return data;
}

const server = new Server(
  { name: "agentfi", version: AGENTFI_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "swap_quote",
      description: `Get optimal token swap quote aggregated across Soroswap, Phoenix, Aqua, and SDEX on Stellar. Costs $${0.001} USDC via x402/MPP.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          tokenIn:   { type: "string", description: "Input token in 'SYMBOL:CONTRACT' format (e.g. 'USDC:GA5ZSE...')" },
          tokenOut:  { type: "string", description: "Output token (e.g. 'XLM:native')" },
          amountIn:  { type: "string", description: "Amount in stroops (1 USDC = 10_000_000 stroops)" },
          slippage:  { type: "number", description: "Max slippage % (default 0.5)" },
        },
        required: ["tokenIn", "tokenOut", "amountIn"],
      },
    },
    {
      name: "swap_execute",
      description: `Execute a token swap on the best Stellar DEX route. Costs $${0.002} USDC via x402/MPP.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          tokenIn:      { type: "string" },
          tokenOut:     { type: "string" },
          amountIn:     { type: "string" },
          slippage:     { type: "number" },
          agentAddress: { type: "string", description: "Agent's Stellar address" },
          signedAuth:   { type: "string", description: "Base64-encoded Soroban auth entry" },
        },
        required: ["tokenIn", "tokenOut", "amountIn", "agentAddress", "signedAuth"],
      },
    },
    {
      name: "vault_deposit",
      description: `Deposit stablecoins into a DeFindex yield vault. Costs $${0.001} USDC via x402/MPP.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          vaultId:      { type: "string", description: "e.g. 'defindex-blend-usdc-v1'" },
          amount:       { type: "string", description: "Amount in stroops" },
          token:        { type: "string", description: "Token to deposit" },
          agentAddress: { type: "string" },
          signedAuth:   { type: "string" },
        },
        required: ["vaultId", "amount", "token", "agentAddress", "signedAuth"],
      },
    },
    {
      name: "vault_apy",
      description: `Query real-time APY, TVL, and utilization for a DeFindex vault. Costs $${0.0005} USDC.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          vaultId: { type: "string", description: "e.g. 'defindex-blend-usdc-v1'" },
        },
        required: ["vaultId"],
      },
    },
    {
      name: "positions",
      description: `Query agent portfolio: wallet balances, vault positions, net yield, and fees spent. Costs $${0.0005} USDC.`,
      inputSchema: {
        type: "object" as const,
        properties: {
          agentAddress: { type: "string" },
        },
        required: ["agentAddress"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case "swap_quote":
        result = await callGateway("/swap/quote", "GET", args as Record<string, string>);
        break;
      case "swap_execute":
        result = await callGateway("/swap/execute", "POST", args);
        break;
      case "vault_deposit":
        result = await callGateway("/vault/deposit", "POST", args);
        break;
      case "vault_apy":
        result = await callGateway("/vault/apy", "GET", args as Record<string, string>);
        break;
      case "positions":
        result = await callGateway("/positions", "GET", args as Record<string, string>);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`AgentFi MCP server v${AGENTFI_VERSION} running (stdio)`);
}

main().catch((err) => {
  console.error("MCP server fatal error:", err);
  process.exit(1);
});
