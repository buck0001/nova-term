"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";

export default function HistoryPage() {
  const { prices, status } = usePrices();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="History" />
        <TickerTape prices={prices} status={status} />
        <div className="page-pad">
          <div className="testnet-banner">⚠ Transaction history is unavailable in demo mode.</div>
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No demo transactions yet.
          </div>
        </div>
      </div>
    </div>
  );
}
