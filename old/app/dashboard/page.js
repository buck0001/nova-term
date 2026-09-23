"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";

// Same 5 bots defined on /bots — kept here too (not imported) since each
// page owns its own local constants in this project.
const BOT_DEFS = [
  { id: "grid", name: "Grid Bot", pair: "BTC/USDT" },
  { id: "dca", name: "DCA Bot", pair: "ETH/USDT" },
  { id: "trend", name: "Trend Follower", pair: "SOL/USDT" },
  { id: "meanrev", name: "Mean Reversion", pair: "AVAX/USDT" },
  { id: "breakout", name: "Breakout Scalper", pair: "LINK/USDT" },
];

const DEFAULT_ACTIVE_BOTS = { grid: true, dca: true, trend: false, meanrev: false, breakout: false };

function fmt(n, d = 2) {
  if (n === null || n === undefined) return "—";

  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function DashboardPage() {
  const supabase = createClient();

  const { prices, status } = usePrices();

  const [selected, setSelected] = useState("bitcoin");
  const [points, setPoints] = useState([]);
  const [chartStatus, setChartStatus] = useState("loading");
  const [balance, setBalance] = useState(null);
  const [botActive, setBotActive] = useState(DEFAULT_ACTIVE_BOTS);

  const pathRef = useRef(null);
  const rowsRef = useRef(null);

  /*
   * ============================================
   * LOAD WALLET BALANCE + REALTIME UPDATES
   * ============================================
   */
  useEffect(() => {
    let channel = null;
    let mounted = true;

    async function loadBalance() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        return;
      }

      if (!user || !mounted) {
        console.log("No authenticated user");
        return;
      }

      // Get current balance
      const { data, error } = await supabase
        .from("wallet_balances")
        .select("eth, usdc, btc")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Balance error:", error);
        return;
      }

      if (!mounted) return;

      setBalance(data);

      // Create a completely new channel
      const channelName = `wallet-balance-${user.id}-${Date.now()}`;

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "wallet_balances",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return;

            console.log("Realtime balance update:", payload.new);

            setBalance(payload.new);
          }
        );

      // Subscribe ONLY after .on() has been configured
      channel.subscribe((status) => {
        console.log("Realtime status:", status);
      });
    }

    loadBalance();

    return () => {
      mounted = false;

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, []);

  /*
   * ============================================
   * LOAD ACTIVE BOTS + REALTIME UPDATES
   * Same rows the Bots page writes to, so toggling
   * a bot there adds/removes it here without a reload.
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
        setBotActive((prev) => {
          const next = { ...prev };
          data.forEach((row) => {
            next[row.bot_id] = row.active;
          });
          return next;
        });
      }

      const channelName = `dashboard-bots-${user.id}-${Date.now()}`;

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
          setBotActive((prev) => ({ ...prev, [payload.new.bot_id]: payload.new.active }));
        }
      );

      channel.subscribe();
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

  /*
   * ============================================
   * LOAD PRICE HISTORY
   * ============================================
   */

  useEffect(() => {
    let cancelled = false;

    setChartStatus("loading");

    fetch(`/api/history?id=${selected}&days=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;

        if (data.points && data.points.length) {
          setPoints(data.points);
          setChartStatus("ok");
        } else {
          setChartStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChartStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  /*
   * ============================================
   * ANIMATE WATCHLIST
   * ============================================
   */

  useEffect(() => {
    if (rowsRef.current) {
      anime({
        targets: rowsRef.current.children,
        opacity: [0, 1],
        translateX: [-8, 0],
        delay: anime.stagger(40),
        duration: 380,
        easing: "easeOutQuad",
      });
    }
  }, [prices.length]);

  /*
   * ============================================
   * ANIMATE CHART
   * ============================================
   */

  useEffect(() => {
    if (pathRef.current && points.length) {
      const len = pathRef.current.getTotalLength();

      pathRef.current.style.strokeDasharray = len;
      pathRef.current.style.strokeDashoffset = len;

      anime({
        targets: pathRef.current,
        strokeDashoffset: [len, 0],
        duration: 900,
        easing: "easeOutCubic",
      });
    }
  }, [points]);

  /*
   * ============================================
   * SELECTED PRICE
   * ============================================
   */

  const selectedPrice = prices.find((p) => p.id === selected);

  /*
   * ============================================
   * ACTIVE BOTS
   * ============================================
   */

  const activeBots = BOT_DEFS.filter((bot) => botActive[bot.id]);

  /*
   * ============================================
   * BUILD SVG CHART
   * ============================================
   */

  let pathD = "";
  let areaD = "";

  if (points.length > 1) {
    const vals = points.map((p) => p.p);

    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const range = max - min || 1;

    const W = 900;
    const H = 220;
    const pad = 14;

    const coords = points.map((pt, i) => {
      const x = (i / (points.length - 1)) * W;

      const y =
        H -
        pad -
        ((pt.p - min) / range) * (H - pad * 2);

      return [x, y];
    });

    pathD =
      "M " +
      coords
        .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" L ");

    areaD = `${pathD} L ${W},${H} L 0,${H} Z`;
  }

  /*
   * ============================================
   * RENDER
   * ============================================
   */

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Topbar title="Dashboard" />

        <TickerTape
          prices={prices}
          status={status}
        />

        <div className="page-pad">
          <div className="testnet-banner">
            ⚠ Prices are live from CoinGecko.
          </div>

          {/* ============================================
              PORTFOLIO SUMMARY
          ============================================ */}

          <div className="summary-grid">
            <SummaryCard
              label="Balance"
              value={`${fmt(
                Number(balance?.usdc || 0),
                2
              )} USDC`}
              value2={`${fmt(
                Number(balance?.btc || 0),
                6
              )} BTC`}
              sub="wallet balance"
            />

            <SummaryCard
              label="Sepolia ETH"
              value={`${fmt(
                Number(balance?.eth || 0),
                4
              )} ETH`}
              sub="balance"
            />

            <SummaryCard
              label="Active bots"
              value={`${activeBots.length} / ${BOT_DEFS.length}`}
              sub="Running"
              accent="var(--mint)"
            />

            <SummaryCard
              label="24h P&L (sim)"
              value="+3.6%"
              sub="Since yesterday"
              accent="var(--mint)"
            />
          </div>

          {/* ============================================
              CHART + WATCHLIST
          ============================================ */}

          <div className="chart-grid">
            {/* CHART */}

            <div
              className="card"
              style={{ padding: 18 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {selectedPrice
                    ? selectedPrice.pair
                    : "Loading…"}
                </div>

                <div
                  className="mono"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--mint)",
                  }}
                >
                  {selectedPrice
                    ? `$${fmt(
                      selectedPrice.price,
                      selectedPrice.price < 10 ? 4 : 2
                    )}`
                    : "—"}
                </div>

                {selectedPrice &&
                  selectedPrice.change24h !== null && (
                    <span
                      className={`mono ${selectedPrice.change24h >= 0
                        ? "up"
                        : "down"
                        }`}
                      style={{ fontSize: 12 }}
                    >
                      {selectedPrice.change24h >= 0
                        ? "+"
                        : ""}
                      {selectedPrice.change24h.toFixed(2)}
                      % (24h)
                    </span>
                  )}

                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "var(--muted)",
                  }}
                >
                  Live · 24h
                </div>
              </div>

              {chartStatus === "loading" && (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                    fontSize: 13,
                  }}
                >
                  Loading real price history…
                </div>
              )}

              {chartStatus === "error" && (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--coral)",
                    fontSize: 13,
                  }}
                >
                  Couldn&apos;t load price history right now.
                </div>
              )}

              {chartStatus === "ok" && (
                <svg
                  viewBox="0 0 900 220"
                  style={{
                    width: "100%",
                    height: 220,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="areaFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--mint)"
                        stopOpacity="0.25"
                      />

                      <stop
                        offset="100%"
                        stopColor="var(--mint)"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d={areaD}
                    fill="url(#areaFill)"
                    stroke="none"
                  />

                  <path
                    ref={pathRef}
                    d={pathD}
                    fill="none"
                    stroke="var(--mint)"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>

            {/* WATCHLIST */}

            <div
              className="card"
              style={{ padding: 14 }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: 10,
                }}
              >
                Watchlist (live)
              </div>

              <div ref={rowsRef}>
                {prices.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 6px",
                      borderRadius: 6,
                      cursor: "pointer",
                      background:
                        selected === p.id
                          ? "var(--panel-2)"
                          : "transparent",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {p.symbol}
                      </div>

                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--muted)",
                        }}
                      >
                        {p.name}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div
                        className="mono"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                        }}
                      >
                        {p.price === null
                          ? "—"
                          : `$${fmt(
                            p.price,
                            p.price < 10 ? 4 : 2
                          )}`}
                      </div>

                      <div
                        className={`mono ${p.change24h >= 0
                          ? "up"
                          : "down"
                          }`}
                        style={{
                          fontSize: 10.5,
                        }}
                      >
                        {p.change24h === null
                          ? "—"
                          : `${p.change24h >= 0
                            ? "+"
                            : ""
                          }${p.change24h.toFixed(2)}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============================================
              ACTIVE BOTS
              Mirrors whatever is toggled on /bots — adds
              a chip the moment a bot is switched on, drops
              it the moment it's switched off.
          ============================================ */}

          <div className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                Active bots
              </div>

              <Link
                href="/bots"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--mint)",
                  textDecoration: "none",
                }}
              >
                Manage →
              </Link>
            </div>

            {activeBots.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                No bots running — activate one from Trading Bots.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {activeBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="mono"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--panel-2)",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      padding: "6px 12px",
                      fontSize: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--mint)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontWeight: 700 }}>{bot.name}</span>
                    <span style={{ color: "var(--muted)" }}>{bot.pair}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  value2,
  sub,
  accent,
}) {
  return (
    <div
      className="card"
      style={{ padding: 16 }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        className="mono"
        style={{
          fontSize: 19,
          fontWeight: 700,
          color: accent || "var(--text)",
        }}
      >
        {value}
      </div>

      {value2 && (
        <div
          className="mono"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          {value2}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}