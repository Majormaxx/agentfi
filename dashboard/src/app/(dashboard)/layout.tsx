import Link             from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { UserButton }     from "@/components/UserButton";
import { BottomNav }      from "@/components/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="header-glass flex items-center justify-between px-5 py-3.5 border-b sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="AgentFi" className="w-7 h-7 rounded-lg" />
          <span className="text-[17px] font-semibold tracking-tight">
            Agent<span style={{ color: "var(--color-earn)" }}>Fi</span>
          </span>
          <span className="badge-testnet">TESTNET</span>
        </Link>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <UserButton />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
