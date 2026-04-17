import type { Metadata } from "next";
import "./globals.css";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ToastProvider }  from "@/components/Toast";
import { Providers }      from "@/components/Providers";
import { UserButton }     from "@/components/UserButton";
import { BottomNav }      from "@/components/BottomNav";

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
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
        <ToastProvider>
          <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="header-glass flex items-center justify-between px-5 py-3.5 border-b sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: "var(--gradient-earn)" }}
                >
                  A
                </div>
                <span className="text-[17px] font-semibold tracking-tight">
                  Agent<span style={{ color: "var(--color-earn)" }}>Fi</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <UserButton />
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
              {children}
            </main>

            {/* Bottom nav */}
            <BottomNav />
          </div>
        </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
