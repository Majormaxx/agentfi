"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { UserCheck, Wallet, SlidersHorizontal, Zap } from "lucide-react";

const STEPS = [
  {
    n: 1,
    Icon: UserCheck,
    title: "Create your account",
    desc: "Email + Face ID or fingerprint. No passwords, no browser plugins.",
  },
  {
    n: 2,
    Icon: Wallet,
    title: "Fund your agent",
    desc: "Send dollars to get started. Your agent wallet is created behind the scenes.",
  },
  {
    n: 3,
    Icon: SlidersHorizontal,
    title: "Set your limits",
    desc: "Choose a daily spending cap and pick which actions your agent can take.",
  },
  {
    n: 4,
    Icon: Zap,
    title: "Turn it on",
    desc: "Your agent starts trading and earning. You stay in control, always.",
  },
];

export default function SetupPage() {
  const { ready, authenticated, login } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/limits");
    }
  }, [ready, authenticated, router]);

  const loading = !ready;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="text-center pt-6 pb-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
          style={{ background: "var(--gradient-earn)" }}
        >
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome to AgentFi</h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Let your AI agent earn interest and trade —<br />while you stay in control.
        </p>
      </div>

      {/* Steps */}
      <div className="card flex flex-col gap-5">
        {STEPS.map(({ n, Icon, title, desc }) => (
          <div key={n} className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--gradient-earn-soft)", border: "1px solid rgba(0,200,150,0.2)" }}
            >
              <Icon size={18} color="var(--color-earn)" strokeWidth={2} />
            </div>
            <div className="pt-0.5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={login}
        disabled={loading}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all duration-200 active:scale-[0.98]"
        style={{
          background: loading ? "var(--color-border)" : "var(--gradient-earn)",
          opacity: loading ? 0.7 : 1,
          boxShadow: loading ? "none" : "0 4px 20px rgba(0,200,150,0.35)",
        }}
      >
        {loading ? "Loading…" : "Get Started"}
      </button>

      <p className="text-xs text-center pb-2" style={{ color: "var(--color-muted)" }}>
        Already have an account?{" "}
        <button
          onClick={login}
          className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-earn)" }}
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
