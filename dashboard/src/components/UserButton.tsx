"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function UserButton() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();

  if (!ready) {
    return <div className="w-9 h-9 rounded-xl skeleton" />;
  }

  if (!authenticated) {
    return (
      <button
        onClick={() => router.push("/setup")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all duration-150 hover:opacity-85 active:scale-95"
        style={{ background: "var(--gradient-earn)" }}
      >
        <LogIn size={13} strokeWidth={2.5} />
        Sign in
      </button>
    );
  }

  const initials = user?.email?.address
    ? user.email.address[0].toUpperCase()
    : user?.wallet?.address
    ? user.wallet.address.slice(2, 4).toUpperCase()
    : "?";

  return (
    <button
      onClick={() => logout()}
      title="Sign out"
      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white transition-all duration-150 hover:opacity-85 active:scale-95"
      style={{ background: "var(--gradient-earn)" }}
    >
      {initials}
    </button>
  );
}
