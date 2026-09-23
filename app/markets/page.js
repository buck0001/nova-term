"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";

function fmt(n, d = 2) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function MarketsPage() {
  const { prices, status } = usePrices();
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const rows = [...prices];
    rows.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [prices, sortKey, sortDir]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Markets" />
        <TickerTape prices={prices} status={status} />

        <div className="page-pad">
          <div className="testnet-banner">⚠ Prices are live from CoinGecko.</div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                  <tr>
                    <Th label="Asset" onClick={() => toggleSort("name")} />
                    <Th label="Price" onClick={() => toggleSort("price")} align="right" />
                    <Th label="24h Change" onClick={() => toggleSort("change24h")} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {status === "loading" && (
                    <tr>
                      <td colSpan={3} style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                        Loading live prices…
                      </td>
                    </tr>
                  )}
                  {status === "error" && (
                    <tr>
                      <td colSpan={3} style={{ padding: 18, textAlign: "center", color: "var(--coral)", fontSize: 13 }}>
                        Price feed unavailable — retrying…
                      </td>
                    </tr>
                  )}
                  {sorted.map((p) => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.symbol}</div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.name}</div>
                      </td>
                      <td className="mono" style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}>
                        {p.price === null ? "—" : `$${fmt(p.price, p.price < 10 ? 4 : 2)}`}
                      </td>
                      <td
                        className={`mono ${p.change24h >= 0 ? "up" : "down"}`}
                        style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, fontWeight: 600 }}
                      >
                        {p.change24h === null ? "—" : `${p.change24h >= 0 ? "+" : ""}${p.change24h.toFixed(2)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ label, onClick, align = "left" }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "12px 16px",
        textAlign: align,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "var(--muted)",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );
}
