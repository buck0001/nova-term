"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";
import { BOT_DEFS, DEFAULT_ACTIVE_BOTS } from "@/lib/bots";

export default function BotsPage() {
  const supabase = createClient();
  const { prices, status } = usePrices();
  const [active, setActive] = useState(DEFAULT_ACTIVE_BOTS);
  const [botErrors, setBotErrors] = useState({}); // { [botId]: errorMessage }
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

    // Pulls the latest saved state from `user_bots`. Split out from the
    // realtime channel setup below so it can also be used as a polling
    // fallback and on tab-focus, without re-subscribing a new channel
    // every time.
    async function fetchBotState() {
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

      if (!mounted || !data) return;

      setActive((prev) => {
        const next = { ...prev };
        data.forEach((row) => {
          next[row.bot_id] = row.active;
        });
        return next;
      });
    }

    async function init() {
      await fetchBotState();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

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

    init();

    // Fallback so bot state still catches up even if Realtime replication
    // isn't switched on for `user_bots` in the Supabase project, and so a
    // change made on /dashboard (or another tab) is picked up as soon as
    // this tab regains focus.
    const poll = setInterval(fetchBotState, 15000);

    function onVisible() {
      if (document.visibilityState === "visible") fetchBotState();
    }

    window.addEventListener("focus", fetchBotState);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearInterval(poll);
      window.removeEventListener("focus", fetchBotState);
      document.removeEventListener("visibilitychange", onVisible);

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  async function toggle(id, cardEl) {
    const nextValue = !active[id];

    setActive((a) => ({ ...a, [id]: nextValue }));
    setBotErrors((e) => ({ ...e, [id]: null }));

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
      // Log the full Supabase error object — message/code/details/hint —
      // since a silent revert with only a console.error is impossible to
      // debug. If this keeps failing for every toggle, the most common
      // causes are: the `set_bot_active` function or `user_bots` table
      // doesn't exist yet in this Supabase project (run the SQL migration),
      // or a Row Level Security policy is blocking the insert/update for
      // this user.
      console.error("Failed to save bot state:", error);

      setBotErrors((e) => ({
        ...e,
        [id]: error.message || "Couldn't save — check console for details.",
      }));

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
            ⚠ Bots use real funds to trade, strategies are derived from live 24h price change.
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

                  {botErrors[bot.id] && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--coral)",
                        background: "var(--coral)18",
                        border: "1px solid var(--coral)55",
                        borderRadius: 6,
                        padding: "6px 8px",
                        lineHeight: 1.4,
                      }}
                    >
                      Couldn&apos;t save: {botErrors[bot.id]}
                    </div>
                  )}

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
