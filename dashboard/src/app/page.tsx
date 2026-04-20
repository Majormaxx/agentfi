"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, TrendingUp, Shield, Zap, ChevronRight, AlertCircle, Clock, Lock } from "lucide-react";
import { api } from "@/lib/api";

// ── Live stats from public API ──────────────────────────────────────────────
function useLiveStats() {
  const [apy, setApy] = useState<string | null>(null);
  useEffect(() => {
    api.vaultApy("defindex-blend-usdc-v1")
      .then(d => setApy(`${d.currentAPY.toFixed(1)}%`))
      .catch(() => {});
  }, []);
  return { apy };
}

// ── Step card ────────────────────────────────────────────────────────────────
function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
        style={{ background: "var(--gradient-earn)" }}
      >
        {n}
      </div>
      <div>
        <p className="font-semibold text-[15px] mb-0.5" style={{ color: "var(--color-text)" }}>{title}</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{body}</p>
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(0,200,150,0.1)" }}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-[15px] mb-1" style={{ color: "var(--color-text)" }}>{title}</p>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{body}</p>
      </div>
    </div>
  );
}

// ── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div
      className="relative w-[220px] h-[420px] rounded-[36px] shadow-2xl overflow-hidden mx-auto"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
        boxShadow: "0 32px 80px rgba(0,200,150,0.18), 0 8px 24px rgba(0,0,0,0.12)",
      }}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <span className="text-[10px] font-semibold" style={{ color: "var(--color-muted)" }}>9:41</span>
        <div className="w-14 h-1.5 rounded-full" style={{ background: "var(--color-border)" }} />
      </div>
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-xs font-bold">Agent<span style={{ color: "#00C896" }}>Fi</span></span>
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: "rgba(0,200,150,0.12)", color: "#00C896" }}>LIVE</span>
      </div>
      <div className="mx-3 rounded-2xl p-4 mb-3"
        style={{ background: "linear-gradient(135deg, #00C896 0%, #00A8D4 100%)" }}>
        <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest mb-1">Portfolio Value</p>
        <p className="text-2xl font-bold text-white leading-none">$1,248.32</p>
        <p className="text-[9px] text-white/80 mt-1">+$23.14 this month · 17.2% APY</p>
      </div>
      <div className="mx-3 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-2"
        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0,200,150,0.12)" }}>
          <Bot size={12} style={{ color: "#00C896" }} />
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-semibold" style={{ color: "var(--color-text)" }}>Agent executing</p>
          <p className="text-[8px]" style={{ color: "var(--color-muted)" }}>Next decision in 0:28</p>
        </div>
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00C896" }} />
      </div>
      {[
        { action: "DEPOSIT", label: "Blend USDC vault", time: "2m ago",  color: "#3B82F6" },
        { action: "SWAP",    label: "XLM → USDC",       time: "18m ago", color: "#00C896" },
        { action: "HOLD",    label: "Rates stable",      time: "35m ago", color: "#6B7280" },
      ].map((tx, i) => (
        <div key={i} className="mx-3 flex items-center gap-2 py-2 border-b"
          style={{ borderColor: "var(--color-border)" }}>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: `${tx.color}18`, color: tx.color }}>{tx.action}</span>
          <span className="text-[9px] flex-1 truncate" style={{ color: "var(--color-text)" }}>{tx.label}</span>
          <span className="text-[8px]" style={{ color: "var(--color-muted)" }}>{tx.time}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { apy } = useLiveStats();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>

      {/* ── Sticky nav ── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="AgentFi" className="w-8 h-8 rounded-xl" />
          <span className="text-lg font-bold tracking-tight">
            Agent<span style={{ color: "#00C896" }}>Fi</span>
          </span>
        </div>
        <Link
          href="/app"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{ background: "var(--gradient-earn)" }}
        >
          Open live demo
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative px-6 pt-16 pb-20 flex flex-col items-center text-center overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,200,150,0.15), transparent)",
          }}
        />

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight max-w-3xl">
          Your capital is idle.{" "}
          <span
            style={{
              background: "var(--gradient-earn)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Your AI agent
          </span>{" "}
          shouldn&apos;t be.
        </h1>

        <p className="mt-5 text-lg sm:text-xl leading-relaxed max-w-2xl" style={{ color: "var(--color-muted)" }}>
          AgentFi deploys an autonomous AI agent that monitors Stellar&apos;s DeFi markets,
          executes yield strategies, and compounds your returns. 24/7, fully transparent,
          no human required.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 shadow-lg"
            style={{
              background: "var(--gradient-earn)",
              boxShadow: "0 8px 32px rgba(0,200,150,0.35)",
            }}
          >
            See it live
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Live on Stellar testnet · Email sign-in · No crypto setup
          </p>
        </div>

        {apy && (
          <div
            className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{
              background: "rgba(0,200,150,0.08)",
              border: "1px solid rgba(0,200,150,0.2)",
              color: "#00C896",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00C896" }} />
            Live yield: {apy} APY · Blend Protocol · Stellar testnet
          </div>
        )}

        <div className="mt-14 relative">
          <div
            className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(to top, var(--color-bg), transparent)" }}
          />
          <PhoneMockup />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section
        className="border-y py-10"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: apy ?? "17%+", label: "Live APY",              hint: "Blend Protocol · Stellar" },
            { value: "< 5s",        label: "Settlement finality",   hint: "every on-chain transaction" },
            { value: "24/7",        label: "Autonomous uptime",     hint: "agent never sleeps" },
            { value: "$0.001",      label: "Cost per decision",     hint: "Groq LLaMA 3.3 inference" },
          ].map(({ value, label, hint }) => (
            <div key={label}>
              <p className="text-3xl font-bold tracking-tight mb-1" style={{ color: "#00C896" }}>{value}</p>
              <p className="text-sm font-semibold mb-0.5">{label}</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#F97316" }}>
            The problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            The yield gap is real. And it&apos;s growing.
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--color-muted)" }}>
            DeFi protocols on Stellar pay 15–20% APY. Most capital earns 0%.
            The only thing standing between them is execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <AlertCircle size={20} style={{ color: "#F97316" }} strokeWidth={2} />,
              bg: "rgba(249,115,22,0.08)",
              border: "rgba(249,115,22,0.2)",
              title: "Capital sits idle",
              body: "Treasury funds earn near 0% in traditional accounts while DeFi protocols pay 15–20%. Every day is a missed opportunity.",
            },
            {
              icon: <Clock size={20} style={{ color: "#3B82F6" }} strokeWidth={2} />,
              bg: "rgba(59,130,246,0.08)",
              border: "rgba(59,130,246,0.2)",
              title: "Markets move 24/7",
              body: "Yield rates shift hourly. No human team can monitor, decide, and execute fast enough to capture optimal returns consistently.",
            },
            {
              icon: <Lock size={20} style={{ color: "#8B5CF6" }} strokeWidth={2} />,
              bg: "rgba(139,92,246,0.08)",
              border: "rgba(139,92,246,0.2)",
              title: "DeFi needs a key",
              body: "The best yield protocols exist but require crypto expertise, wallets, and manual execution. Most teams can't or won't operate them.",
            },
          ].map(({ icon, bg, border, title, body }) => (
            <div key={title} className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                {icon}
              </div>
              <div>
                <p className="font-semibold text-[15px] mb-1" style={{ color: "var(--color-text)" }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="py-20"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#00C896" }}>
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Deploy once. Earn continuously.
            </h2>
            <p className="mt-3 text-base" style={{ color: "var(--color-muted)" }}>
              From zero to autonomous yield in under a minute.
            </p>
          </div>

          <div className="max-w-lg mx-auto flex flex-col gap-8">
            <Step
              n="1"
              title="Connect in 30 seconds"
              body="Authenticate with email via Privy. Your dedicated Stellar wallet is provisioned instantly and funded. No seed phrases, no setup, no crypto expertise required."
            />
            <div className="ml-4 w-px h-8" style={{ background: "var(--color-border)" }} />
            <Step
              n="2"
              title="Agent deploys autonomously"
              body="Llama 3.3 on Groq analyzes Blend Protocol yields every 30 seconds. It deposits, rebalances, or holds, and shows you the plain-English reasoning behind every decision."
            />
            <div className="ml-4 w-px h-8" style={{ background: "var(--color-border)" }} />
            <Step
              n="3"
              title="Capital compounds. You stay in control."
              body="Full withdrawal any time. Set daily agent spending limits. Every transaction is on-chain and fully auditable. The agent works. You retain authority."
            />
          </div>
        </div>
      </section>

      {/* ── Why AgentFi ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#00C896" }}>
            Why AgentFi
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Execution, not just intelligence
          </h2>
          <p className="mt-3 text-base" style={{ color: "var(--color-muted)" }}>
            Most AI tools tell you what to do. AgentFi does it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Feature
            icon={<Bot size={20} style={{ color: "#00C896" }} strokeWidth={2} />}
            title="Autonomous execution, not just alerts"
            body="Unlike dashboards or price trackers, AgentFi's agent actually executes. Deposit, swap, rebalance on-chain, in seconds, without you lifting a finger."
          />
          <Feature
            icon={<TrendingUp size={20} style={{ color: "#00C896" }} strokeWidth={2} />}
            title="Live yield from audited protocols"
            body="APY data is pulled live from Blend Protocol on Stellar. Not projected, not estimated. What you see is what the protocol pays right now, verifiable on-chain."
          />
          <Feature
            icon={<Shield size={20} style={{ color: "#00C896" }} strokeWidth={2} />}
            title="Transparent AI reasoning"
            body="Every agent decision includes a plain-English rationale visible in your dashboard. Set daily spending limits. Withdraw at any time. Full auditability at every step."
          />
          <Feature
            icon={<Zap size={20} style={{ color: "#00C896" }} strokeWidth={2} />}
            title="Institutional-grade infrastructure"
            body="Stellar settles in 3–5s at $0.00001/tx. Groq delivers sub-second LLM inference. Privy provides enterprise wallet auth. No compromises on speed, cost, or security."
          />
        </div>
      </section>

      {/* ── Built on trust bar ── */}
      <section
        className="border-y py-14"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-10"
            style={{ color: "var(--color-muted)" }}>
            Built on proven infrastructure
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              {
                name: "Stellar",
                tag: "Blockchain layer",
                desc: "ISO 20022-compliant · $0.00001/tx · 5s finality",
                color: "#7C3AED",
              },
              {
                name: "Groq",
                tag: "AI inference",
                desc: "Fastest LLM runtime · Llama 3.3-70b · <500ms",
                color: "#F97316",
              },
              {
                name: "Blend Protocol",
                tag: "Yield layer",
                desc: "Audited lending & yield on Stellar mainnet",
                color: "#00C896",
              },
              {
                name: "Privy",
                tag: "Auth & wallets",
                desc: "Enterprise-grade · email sign-in · no seed phrases",
                color: "#3B82F6",
              },
            ].map(({ name, tag, desc, color }) => (
              <div key={name} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <p className="font-bold text-sm" style={{ color: "var(--color-text)" }}>{name}</p>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>{tag}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Earn loop visual ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#00C896" }}>
          The earn loop
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Every 30 seconds, without fail
        </h2>
        <p className="text-base mb-12" style={{ color: "var(--color-muted)" }}>
          The agent analyzes, decides, and executes. Then does it again. Automatically. Indefinitely.
        </p>

        <div className="relative">
          <div
            className="w-64 h-64 rounded-full mx-auto border-2 flex items-center justify-center relative"
            style={{
              borderColor: "rgba(0,200,150,0.2)",
              background: "radial-gradient(circle, rgba(0,200,150,0.06) 0%, transparent 70%)",
            }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-2"
                style={{ background: "var(--gradient-earn)" }}
              >
                <Bot size={28} strokeWidth={2} className="text-white" />
              </div>
              <p className="text-sm font-bold">AI Agent</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>always on</p>
            </div>

            {[
              { label: "Analyze",  angle: -90, color: "#00C896" },
              { label: "Execute",  angle: 30,  color: "#3B82F6" },
              { label: "Compound", angle: 150, color: "#F97316" },
            ].map(({ label, angle, color }) => {
              const rad = (angle * Math.PI) / 180;
              const r = 112;
              const x = 50 + (r / 128) * 50 * Math.cos(rad);
              const y = 50 + (r / 128) * 50 * Math.sin(rad);
              return (
                <div key={label} className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white"
                    style={{ background: color, whiteSpace: "nowrap" }}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-20 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(0,200,150,0.08) 0%, rgba(0,168,212,0.06) 100%)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            See AgentFi in action
          </h2>
          <p className="text-base mb-8" style={{ color: "var(--color-muted)" }}>
            The live demo runs on Stellar testnet. Trigger the AI agent, watch it decide,
            and see every on-chain transaction in real time. No pitch deck required.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 shadow-xl"
            style={{
              background: "var(--gradient-earn)",
              boxShadow: "0 12px 40px rgba(0,200,150,0.4)",
            }}
          >
            Open the live demo
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
          <p className="mt-4 text-sm" style={{ color: "var(--color-muted)" }}>
            Deployed on Stellar testnet · AI decisions every 30 seconds · Full source on GitHub
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="AgentFi" className="w-7 h-7 rounded-lg" />
            <span className="font-bold tracking-tight">
              Agent<span style={{ color: "#00C896" }}>Fi</span>
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(0,200,150,0.1)", color: "#00C896" }}>
              TESTNET
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            Built on Stellar · AI by Groq · Yield via Blend Protocol · Auth by Privy
          </p>
          <Link
            href="/app"
            className="flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: "#00C896" }}
          >
            Live demo
            <ChevronRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </footer>

    </div>
  );
}
