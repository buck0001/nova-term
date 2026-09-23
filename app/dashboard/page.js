"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { BOT_DEFS, DEFAULT_ACTIVE_BOTS } from "@/lib/bots";

export default function DashboardPage() {
  const { prices, status } = usePrices();
  const [selected, setSelected] = useState("bitcoin");
  const [points, setPoints] = useState([]);
  const [chartStatus, setChartStatus] = useState("loading");
  const rowsRef = useRef(null);
  const activeBots = BOT_DEFS.filter((bot) => DEFAULT_ACTIVE_BOTS[bot.id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/history?id=${selected}&days=1`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setPoints(data.points || []);
        setChartStatus(data.points?.length ? "ok" : "error");
      })
      .catch(() => !cancelled && setChartStatus("error"));
    return () => { cancelled = true; };
  }, [selected]);

  useEffect(() => {
    if (rowsRef.current) anime({ targets: rowsRef.current.children, opacity: [0, 1], translateY: [8, 0], delay: anime.stagger(50), duration: 350 });
  }, []);

  const btc = prices.find((item) => item.symbol === "BTC");
  const eth = prices.find((item) => item.symbol === "ETH");

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Dashboard" />
        <TickerTape prices={prices} status={status} />
        <div className="page-pad">
          <div className="testnet-banner">⚠ Demo mode — balances, bots, and performance are illustrative only.</div>
          <div className="summary-grid">
            <Stat label="Demo Balance" value="$25,000.00" detail="simulation" />
            <Stat label="BTC" value={btc ? `$${btc.price.toLocaleString()}` : "—"} detail="live market price" />
            <Stat label="ETH" value={eth ? `$${eth.price.toLocaleString()}` : "—"} detail="live market price" />
            <Stat label="Active Bots" value={activeBots.length} detail="local demo state" />
          </div>
          <div className="chart-grid">
            <div className="card" style={{ padding: 18, minHeight: 260 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <strong>Market history</strong>
                <select value={selected} onChange={(event) => setSelected(event.target.value)} className="demo-select">
                  <option value="bitcoin">BTC</option><option value="ethereum">ETH</option><option value="solana">SOL</option>
                </select>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{chartStatus === "loading" ? "Loading chart…" : chartStatus === "error" ? "Chart unavailable" : `${points.length} live points loaded`}</div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <strong>Active strategies</strong>
              <div ref={rowsRef} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {activeBots.map((bot) => <div key={bot.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{bot.name}</span><span className="up">Running</span></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }) {
  return <div className="card" style={{ padding: 16 }}><div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{value}</div><div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>{detail}</div></div>;
}
