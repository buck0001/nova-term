"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { BOT_DEFS, DEFAULT_ACTIVE_BOTS } from "@/lib/bots";

export default function BotsPage() {
  const { prices, status } = usePrices();
  const [active, setActive] = useState(DEFAULT_ACTIVE_BOTS);
  const cardsRef = useRef(null);

  useEffect(() => {
    if (cardsRef.current) {
      anime({ targets: cardsRef.current.children, opacity: [0, 1], translateY: [12, 0], delay: anime.stagger(60), duration: 420 });
    }
  }, []);

  function toggle(id, cardEl) {
    setActive((current) => ({ ...current, [id]: !current[id] }));
    if (cardEl) anime({ targets: cardEl, scale: [1, 1.015, 1], duration: 260 });
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Trading Bots" />
        <TickerTape prices={prices} status={status} />
        <div className="page-pad">
          <div className="testnet-banner">⚠ Demo strategies only — no real orders or funds are used.</div>
          <div ref={cardsRef} className="bots-grid">
            {BOT_DEFS.map((bot) => {
              const price = prices.find((item) => item.pair === bot.pair);
              const simulated = price?.change24h == null ? "—" : `${(price.change24h * 0.6).toFixed(2)}%`;
              return (
                <div key={bot.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{bot.name}</div>
                      <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>{bot.pair}</div>
                    </div>
                    <Toggle checked={active[bot.id]} onChange={() => toggle(bot.id, document.activeElement?.closest(".card"))} />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{bot.logic}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--muted)" }}>{bot.param.label}</span><span className="mono">{bot.param.value}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--muted)" }}>Simulated P&L</span><span className={simulated.startsWith("-") ? "down mono" : "up mono"}>{simulated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return <label className="toggle"><input type="checkbox" checked={Boolean(checked)} onChange={onChange} /><span className="toggle-track" /></label>;
}
