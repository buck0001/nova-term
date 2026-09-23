"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";

function fmt(n, d = 4) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const supabase = createClient();
  const { prices, status } = usePrices();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, asset, amount, destination, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setTxs(data || []);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="History" />
        <TickerTape prices={prices} status={status} />

        <div className="page-pad">
          <div className="testnet-banner">
            ⚠ Deposit and withdrawal history.
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                Loading history…
              </div>
            )}

            {!loading && error && (
              <div style={{ padding: 20, color: "var(--coral)", fontSize: 12.5, lineHeight: 1.6 }}>
                Couldn&apos;t load history: {error}
                <br />
                If this says the <code className="mono">transactions</code> table doesn&apos;t exist yet, run the
                SQL migration against your Supabase project first.
              </div>
            )}

            {!loading && !error && txs.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No transactions yet — deposit or withdraw something to see it here.
              </div>
            )}

            {!loading && !error && txs.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                  <thead>
                    <tr>
                      <Th label="Type" />
                      <Th label="Asset" />
                      <Th label="Amount" align="right" />
                      <Th label="Destination" />
                      <Th label="Status" />
                      <Th label="Date" />
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => (
                      <tr key={tx.id} style={{ borderTop: "1px solid var(--line)" }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>
                          <span className={tx.type === "deposit" ? "up" : "down"}>
                            {tx.type === "deposit" ? "Deposit" : "Withdraw"}
                          </span>
                        </td>
                        <td className="mono" style={{ padding: "12px 16px", fontSize: 13 }}>
                          {String(tx.asset).toUpperCase()}
                        </td>
                        <td className="mono" style={{ padding: "12px 16px", fontSize: 13, textAlign: "right" }}>
                          {fmt(tx.amount)}
                        </td>
                        <td className="mono" style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)" }}>
                          {tx.destination ? `${tx.destination.slice(0, 6)}…${tx.destination.slice(-4)}` : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--muted)" }}>
                          {tx.status}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          {fmtDate(tx.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ label, align = "left" }) {
  return (
    <th
      style={{
        padding: "12px 16px",
        textAlign: align,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: "var(--muted)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );
}
