"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";

const BOT_DEFS = [
  {
    id: "grid",
    name: "Grid Bot",
    pair: "BTC/USDT",
    logic:
      "Places buy and sell orders at fixed price steps above and below the current price. Buys each time price falls one grid step, sells each time it rises one step.",
    param: { label: "Grid step", value: "0.5%" },
  },
  {
    id: "dca",
    name: "DCA Bot",
    pair: "ETH/USDT",
    logic:
      "Buys a fixed dollar amount on a fixed schedule, regardless of price, to average the entry cost over time instead of timing the market.",
    param: { label: "Buy interval", value: "Every 4h" },
  },
  {
    id: "trend",
    name: "Trend Follower",
    pair: "SOL/USDT",
    logic:
      "Watches a short and a long moving average. Buys when the short average crosses above the long one, sells when it crosses back below.",
    param: { label: "MA crossover", value: "9 / 21" },
  },
  {
    id: "meanrev",
    name: "Mean Reversion",
    pair: "AVAX/USDT",
    logic:
      "Buys when price drops well below its recent average, on the assumption it will bounce back, then sells once price returns to that average.",
    param: { label: "Deviation trigger", value: "2.5%" },
  },
  {
    id: "breakout",
    name: "Breakout Scalper",
    pair: "LINK/USDT",
    logic:
      "Buys when price breaks above its recent high by a small margin, then exits quickly at a fixed profit target or stop-loss.",
    param: { label: "Breakout margin", value: "0.8%" },
  },
];

export default function BotsPage() {
  const supabase = createClient();
  const { prices, status } = usePrices();
  const [active, setActive] = useState({ grid: true, dca: true, trend: false, meanrev: false, breakout: false });
  const cardsRef = useRef(null);

  useEffect(() => {
    if (cardsRef.current) {
      anime({
        targets: cardsRef.current.children,
        opacity: [0, 1],
        translateY: [12, 0],
        delay: anime.stagger(60),
        duration: 420,
        easing: "easeOutQuad",
      });
    }
  }, []);

  /*
   * ============================================
   * LOAD SAVED BOT STATE + REALTIME UPDATES
   * (same channel-per-mount pattern as the wallet
   * balance subscription on /dashboard)
   * ============================================
   */
  useEffect(() => {
    let channel = null;
    let mounted = true;

    async function loadBots() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || !mounted) {
        if (userError) console.error("User error:", userError);
        return;
      }

      const { data, error } = await supabase
        .from("user_bots")
        .select("bot_id, active")
        .eq("user_id", user.id);

      if (error) {
        console.error("Bot state error:", error);
        return;
      }

      if (!mounted) return;

      if (data && data.length) {
        setActive((prev) => {
          const next = { ...prev };
          data.forEach((row) => {
            next[row.bot_id] = row.active;
          });
          return next;
        });
      }

      const channelName = `user-bots-${user.id}-${Date.now()}`;

      channel = supabase.channel(channelName).on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_bots",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (!mounted || !payload.new) return;
          setActive((prev) => ({ ...prev, [payload.new.bot_id]: payload.new.active }));
        }
      );

      channel.subscribe((status) => {
        console.log("Bot realtime status:", status);
      });
    }

    loadBots();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  async function toggle(id, cardEl) {
    const nextValue = !active[id];

    setActive((a) => ({ ...a, [id]: nextValue }));

    if (cardEl) {
      anime({ targets: cardEl, scale: [1, 1.015, 1], duration: 260, easing: "easeOutQuad" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.rpc("set_bot_active", {
      p_bot_id: id,
      p_active: nextValue,
    });

    if (error) {
      console.error("Failed to save bot state:", error);
      // Revert locally so the toggle reflects what's actually saved.
      setActive((a) => ({ ...a, [id]: !nextValue }));
    }
  }

  function priceFor(pair) {
    return prices.find((p) => p.pair === pair);
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Trading Bots" />
        <TickerTape prices={prices} status={status} />

        <div className="page-pad">
          <div className="testnet-banner">
            ⚠ Simulated bots only — no real orders are placed. P&amp;L shown is illustrative, derived from live 24h price change.
          </div>

          <div ref={cardsRef} className="bots-grid">
            {BOT_DEFS.map((bot) => {
              const isActive = active[bot.id];
              const p = priceFor(bot.pair);
              // purely illustrative "simulated" return, derived from real 24h change
              const simReturn = p && p.change24h !== null ? (p.change24h * 0.6).toFixed(2) : null;

              return (
                <div key={bot.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{bot.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }} className="mono">
                        {bot.pair}
                      </div>
                    </div>
                    <Toggle checked={isActive} onChange={(e) => toggle(bot.id, e.currentTarget.closest(".card"))} />
                  </div>

                  <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{bot.logic}</p>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                    <span style={{ color: "var(--muted)" }}>{bot.param.label}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {bot.param.value}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--muted)" }}>Live price</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {p && p.price !== null ? `$${p.price.toLocaleString("en-US", { maximumFractionDigits: p.price < 10 ? 4 : 2 })}` : "—"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 6,
                      paddingTop: 10,
                      borderTop: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      {isActive ? "Running · simulated P&L" : "Paused"}
                    </span>
                    <span
                      className={`mono ${simReturn === null ? "" : simReturn >= 0 ? "up" : "down"}`}
                      style={{ fontSize: 13, fontWeight: 700, opacity: isActive ? 1 : 0.4 }}
                    >
                      {simReturn === null ? "—" : `${simReturn >= 0 ? "+" : ""}${simReturn}%`}
                    </span>
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
  return (
    <label style={{ position: "relative", display: "inline-block", width: 38, height: 21, flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
      <span
        style={{
          position: "absolute",
          cursor: "pointer",
          inset: 0,
          background: checked ? "var(--mint)" : "var(--line)",
          borderRadius: 999,
          transition: "background .18s",
        }}
      >
        <span
          style={{
            position: "absolute",
            height: 15,
            width: 15,
            left: checked ? 20 : 3,
            top: 3,
            background: checked ? "#04120F" : "#8a93a3",
            borderRadius: "50%",
            transition: "left .18s",
          }}
        />
      </span>
    </label>
  );
}
