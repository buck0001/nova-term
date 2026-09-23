"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "◱" },
  { href: "/markets", label: "Markets", icon: "☰" },
  { href: "/bots", label: "Trading Bots", icon: "◇" },
  { href: "/wallet", label: "Deposit / Withdraw", icon: "⇅" },
  { href: "/history", label: "History", icon: "◷" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        width: collapsed ? 64 : 220,
        minWidth: collapsed ? 64 : 220,
        background: "var(--panel)",
        borderRight: "1px solid var(--line)",
        padding: "18px 0",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexShrink: 0,
        transition: "width 0.2s ease, min-width 0.2s ease",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 0 20px" : "0 14px 20px 18px",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo */}
          <div
            style={{
              width: 26,
              height: 26,
              minWidth: 26,
              borderRadius: 6,
              background:
                "linear-gradient(135deg, var(--mint), var(--mint-dim))",
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

          {/* NOVA text */}
          {!collapsed && (
            <span
              style={{
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: 0.4,
              }}
            >
              NOVA
            </span>
          )}
        </div>

        {/* Collapse button */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            style={{
              width: 28,
              height: 28,
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "var(--panel-2)",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          style={{
            width: 32,
            height: 28,
            margin: "0 auto 10px",
            border: "1px solid var(--line)",
            borderRadius: 6,
            background: "var(--panel-2)",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      )}

      {/* Navigation */}
      {links.map((l) => {
        const active = pathname === l.href;

        return (
          <Link
            key={l.href}
            href={l.href}
            title={collapsed ? l.label : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              padding: collapsed ? "11px 0" : "10px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              color: active ? "var(--text)" : "var(--muted)",
              borderLeft: active
                ? "2px solid var(--mint)"
                : "2px solid transparent",
              background: active ? "var(--panel-2)" : "transparent",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <span
              style={{
                opacity: 0.85,
                fontSize: 17,
                lineHeight: 1,
              }}
            >
              {l.icon}
            </span>

            {!collapsed && l.label}
          </Link>
        );
      })}

      {/* Bottom */}
      <div
        style={{
          marginTop: "auto",
          padding: collapsed ? "18px 8px" : "18px",
        }}
      >
        {!collapsed && (
          <div
            className="testnet-banner"
            style={{
              fontSize: 11,
              padding: "8px 10px",
            }}
          ></div>
        )}
      </div>
    </div>
  );
}
