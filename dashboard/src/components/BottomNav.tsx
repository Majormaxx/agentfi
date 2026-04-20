"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PieChart, SlidersHorizontal } from "lucide-react";

const NAV_ITEMS = [
  { href: "/app",        label: "Home",      Icon: Home },
  { href: "/portfolio", label: "Portfolio", Icon: PieChart },
  { href: "/limits",    label: "Limits",    Icon: SlidersHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-t sticky bottom-0 z-10"
      style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
    >
      <div className="max-w-md mx-auto flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-3 gap-1 relative transition-all duration-150 active:scale-95"
              style={{ color: active ? "var(--color-earn)" : "var(--color-muted)" }}
            >
              {/* Active indicator bar at top */}
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full transition-all duration-300 ease-out"
                style={{
                  width: active ? "28px" : "0px",
                  height: "2px",
                  background: "var(--color-earn)",
                }}
              />

              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className="transition-transform duration-150"
                style={{ transform: active ? "scale(1.1)" : "scale(1)" }}
              />
              <span
                className="text-xs font-medium transition-all duration-150"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
