/**
 * GET /wallet/me
 * Returns (or provisions) the authenticated user's personal Stellar testnet wallet.
 * On first call: generates a new Keypair, persists it, and funds it via Stellar friendbot.
 * Requires Privy JWT via requireAuth middleware.
 */
import { Router, Request, Response } from "express";
import { Keypair } from "@stellar/stellar-sdk";
import { getUserWallet, createUserWallet, markWalletFunded } from "../db/database.js";
import { config } from "../config.js";

const router = Router();

router.get("/wallet/me", async (req: Request, res: Response) => {
  const privyUserId: string | undefined = res.locals.privy?.userId;
  if (!privyUserId) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "User ID missing from token" });
    return;
  }

  // Return existing wallet if already provisioned
  let wallet = getUserWallet(privyUserId);
  if (wallet) {
    res.json({ stellarAddress: wallet.stellarAddress, funded: wallet.funded });
    return;
  }

  // Generate a new Stellar keypair for this user
  const keypair = Keypair.random();
  createUserWallet(privyUserId, keypair.publicKey(), keypair.secret());

  // Fund via Stellar testnet friendbot (best-effort)
  let funded = false;
  if (config.stellarNetwork !== "mainnet") {
    try {
      const r = await fetch(`https://friendbot.stellar.org?addr=${keypair.publicKey()}`);
      if (r.ok) {
        markWalletFunded(privyUserId);
        funded = true;
      }
    } catch {
      // Friendbot failure is non-fatal — wallet is still created
    }
  }

  res.json({ stellarAddress: keypair.publicKey(), funded });
});

export default router;
