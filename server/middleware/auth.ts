/**
 * Privy JWT authentication middleware.
 *
 * Expects the dashboard to send:
 *   Authorization: Bearer <privy-access-token>
 *
 * Verifies the token with the Privy server SDK and attaches the parsed
 * claims to `res.locals.privy` for downstream route handlers.
 */
import { PrivyClient } from "@privy-io/server-auth";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

let _client: PrivyClient | null = null;

function getClient(): PrivyClient {
  if (_client) return _client;
  if (!config.privyAppId || !config.privyAppSecret) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be set");
  }
  _client = new PrivyClient(config.privyAppId, config.privyAppSecret);
  return _client;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Missing Bearer token" });
    return;
  }

  const token = header.slice(7);
  try {
    const claims = await getClient().verifyAuthToken(token);
    res.locals.privy = claims;
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired token" });
  }
}
