import type { Metadata } from "next";
import "./globals.css";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ToastProvider }  from "@/components/Toast";

export const metadata: Metadata = {
  title: "AgentFi",
  description: "DeFi for the agent economy — let your AI agent earn while you stay in control.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var stored = localStorage.getItem('theme');
            var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (stored === 'dark' || (!stored && prefersDark)) {
              document.documentElement.classList.add('dark');
            }
          })()
        `}} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header
              className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <span className="text-xl font-semibold tracking-tight">
                Agent<span style={{ color: "var(--color-earn)" }}>Fi</span>
              </span>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: "var(--color-earn)", color: "#fff" }}
                >
                  M
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
              {children}
            </main>

            {/* Bottom nav */}
            <nav
              className="border-t sticky bottom-0 z-10"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <div className="max-w-md mx-auto flex">
                {[
                  { href: "/",          label: "Home",      icon: "⌂" },
                  { href: "/portfolio", label: "Portfolio", icon: "◈" },
                  { href: "/limits",    label: "Limits",    icon: "⚙" },
                ].map(({ href, label, icon }) => (
                  <a
                    key={href}
                    href={href}
                    className="flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors hover:opacity-80"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <span className="text-lg leading-none">{icon}</span>
                    {label}
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
