"use client";

import { useState } from "react";

const STEPS = [
  {
    n: 1,
    title: "Create your account",
    desc: "Email + Face ID or fingerprint. No passwords, no browser plugins.",
    icon: "🔑",
  },
  {
    n: 2,
    title: "Fund your agent",
    desc: "Send dollars to get started. Your agent wallet is created behind the scenes.",
    icon: "💵",
  },
  {
    n: 3,
    title: "Set your limits",
    desc: "Choose a daily spending cap and pick which actions your agent can take.",
    icon: "⚙️",
  },
  {
    n: 4,
    title: "Turn it on",
    desc: "Your agent starts trading and earning. You stay in control, always.",
    icon: "✅",
  },
];

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Simulate passkey registration (Privy would handle this in production)
    await new Promise((r) => setTimeout(r, 1500));
    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="text-xl font-semibold">Account created</h1>
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          Your agent wallet is ready. Set your limits and turn it on.
        </p>
        <a
          href="/limits"
          className="w-full py-3 rounded-xl font-medium text-sm text-center text-white"
          style={{ background: "var(--color-earn)" }}
        >
          Set limits →
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to AgentFi</h1>
        <p className="text-sm mt-2" style={{ color: "var(--color-muted)" }}>
          Let your AI agent earn interest and trade — while you stay in control.
        </p>
      </div>

      {/* Steps */}
      <div className="card flex flex-col gap-5">
        {STEPS.map((step) => (
          <div key={step.n} className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ background: "var(--color-earn)", color: "#fff" }}
            >
              {step.n}
            </div>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Sign-up form */}
      <form onSubmit={handleStart} className="flex flex-col gap-3">
        <label className="text-sm font-medium">Email address</label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            background:  "var(--color-surface)",
            border:      "1px solid var(--color-border)",
            color:       "var(--color-text)",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-medium text-sm text-white transition-opacity"
          style={{
            background: "var(--color-earn)",
            opacity:    loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating account…" : "Get Started with Face ID"}
        </button>
      </form>

      <p className="text-xs text-center" style={{ color: "var(--color-muted)" }}>
        Already have an account?{" "}
        <a href="/" className="underline" style={{ color: "var(--color-earn)" }}>
          Sign in
        </a>
      </p>
    </div>
  );
}
