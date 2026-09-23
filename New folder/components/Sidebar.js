"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "◱" },
  { href: "/markets", label: "Markets", icon: "☰" },
  { href: "/bots", label: "Trading Bots", icon: "◇" },
  { href: "/wallet", label: "Deposit / Withdraw", icon: "⇅" },
  { href: "/history", label: "History", icon: "◷" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        width: 220,
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        padding: "18px 0",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px 20px" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "linear-gradient(135deg, var(--mint), var(--mint-dim))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: "#04120F",
            fontSize: 14,
          }}
        >
          N
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: 0.4 }}>NOVA</span>
      </div>

      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              color: active ? "var(--text)" : "var(--muted)",
              borderLeft: active ? "2px solid var(--mint)" : "2px solid transparent",
              background: active ? "var(--panel-2)" : "transparent",
              textDecoration: "none",
            }}
          >
            <span style={{ opacity: 0.85 }}>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto", padding: "18px" }}>
        <div className="testnet-banner" style={{ fontSize: 11, padding: "8px 10px" }}>
          NOVA
        </div>
      </div>
    </div>
  );
}
