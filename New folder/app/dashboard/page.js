"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";
import { BOT_DEFS, DEFAULT_ACTIVE_BOTS } from "@/lib/bots";

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

    // Pulls the current row from `wallet_balances`. Split out from the
    // channel setup below so it can double as a polling fallback and a
    // tab-focus refetch, instead of only ever updating via Realtime.
    async function fetchBalance() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        return;
      }

      if (!user || !mounted) {
        return;
      }

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
    }

    async function init() {
      await fetchBalance();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

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
            setBalance(payload.new);
          }
        );

      channel.subscribe((status) => {
        console.log("Realtime status:", status);
      });
    }

    init();

    // Fallback so BTC/ETH/USDT balances still catch up even if Realtime
    // replication isn't switched on for `wallet_balances` in the Supabase
    // project (Database → Replication), and so a deposit confirmed on
    // /wallet shows up here as soon as this tab regains focus.
    const poll = setInterval(fetchBalance, 15000);

    function onVisible() {
      if (document.visibilityState === "visible") fetchBalance();
    }

    window.addEventListener("focus", fetchBalance);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearInterval(poll);
      window.removeEventListener("focus", fetchBalance);
      document.removeEventListener("visibilitychange", onVisible);

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

    // Pulls the latest saved state from `user_bots`. Split out from the
    // channel setup below so it can double as a polling fallback and a
    // tab-focus refetch — this is what guarantees a bot activated or
    // deactivated on /bots shows up here even if Realtime isn't wired up.
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

      setBotActive((prev) => {
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

    init();

    // Fallback poll + refetch-on-focus, same reasoning as the balance
    // effect above.
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
   * MAIN BALANCE (all assets rolled into USDT + BTC)
   * ============================================
   */

  const btcPrice = prices.find((p) => p.id === "bitcoin")?.price ?? null;
  const ethPrice = prices.find((p) => p.id === "ethereum")?.price ?? null;

  const usdtAmt = Number(balance?.usdc || 0); // `usdc` column holds the USDT test-fund balance
  const btcAmt = Number(balance?.btc || 0);
  const ethAmt = Number(balance?.eth || 0);

  const btcValueUsdt = btcPrice !== null ? btcAmt * btcPrice : null;
  const ethValueUsdt = ethPrice !== null ? ethAmt * ethPrice : null;

  // Total portfolio value in USDT terms — every balance (USDT, BTC, ETH)
  // converted at the live price and summed.
  const totalUsdt = usdtAmt + (btcValueUsdt ?? 0) + (ethValueUsdt ?? 0);

  // Same total, expressed in BTC terms.
  const totalBtc = btcPrice ? totalUsdt / btcPrice : null;

  const hasFunds = balance !== null && totalUsdt > 0;

  /*
   * ============================================
   * SIMULATED 24H P&L
   * Not a fixed number: it's the average live 24h
   * change (same 0.6x dampening used per-bot on
   * /bots) across whichever bots are active right
   * now, and it only shows once test funds have
   * actually been deposited.
   * ============================================
   */

  let pnlPercent = null;

  if (hasFunds && activeBots.length) {
    const returns = activeBots
      .map((bot) => prices.find((p) => p.pair === bot.pair))
      .filter((p) => p && p.change24h !== null)
      .map((p) => p.change24h * 0.6);

    if (returns.length) {
      pnlPercent = returns.reduce((a, b) => a + b, 0) / returns.length;
    }
  }

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
              label="Main Balance"
              value={`${fmt(totalUsdt, 2)} USDT`}
              value2={totalBtc !== null ? `${fmt(totalBtc, 6)} BTC` : "—"}
              sub="All assets, live-converted"
            />

            <SummaryCard
              label="BTC Balance"
              value={`${fmt(btcAmt, 6)} BTC`}
              value2={btcValueUsdt !== null ? `≈ ${fmt(btcValueUsdt, 2)} USDT` : undefined}
              sub="wallet balance"
            />

            <SummaryCard
              label="Sepolia ETH"
              value={`${fmt(ethAmt, 4)} ETH`}
              value2={ethValueUsdt !== null ? `≈ ${fmt(ethValueUsdt, 2)} USDT` : undefined}
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
              value={
                !hasFunds
                  ? "—"
                  : pnlPercent === null
                  ? "—"
                  : `${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%`
              }
              sub={
                !hasFunds
                  ? "Deposit test funds to begin"
                  : pnlPercent === null
                  ? "No active bots"
                  : "Since yesterday (sim)"
              }
              accent={
                !hasFunds || pnlPercent === null
                  ? undefined
                  : pnlPercent >= 0
                  ? "var(--mint)"
                  : "var(--coral)"
              }
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