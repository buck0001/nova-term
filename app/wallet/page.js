"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";

export default function WalletPage() {
  const { prices, status } = usePrices();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Deposit / Withdraw" />
        <TickerTape prices={prices} status={status} />
        <div className="page-pad" style={{ maxWidth: 560 }}>
          <div className="testnet-banner">⚠ Deposits and withdrawals are disabled in demo mode.</div>
          <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", lineHeight: 1.6 }}>
            <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 8 }}>
              No wallet or transfers are connected.
            </div>
            This page is visual-only. Deposit and withdrawal actions are unavailable.
          </div>
        </div>
      </div>
    </div>
  );
}
