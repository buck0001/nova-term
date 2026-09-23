"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";

function fmt(n, d = 2) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function TickerTape({ prices, status }) {
  const tapeRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!tapeRef.current || prices.length === 0) return;
    animRef.current?.pause();
    const width = tapeRef.current.scrollWidth / 3;
    animRef.current = anime({
      targets: tapeRef.current,
      translateX: [0, -width],
      duration: 26000,
      easing: "linear",
      loop: true,
    });
    return () => animRef.current?.pause();
  }, [prices]);

  const items = prices.length ? [...prices, ...prices, ...prices] : [];

  return (
    <div
      style={{
        background: "var(--panel-2)",
        borderBottom: "1px solid var(--line)",
        overflow: "hidden",
        height: 36,
        display: "flex",
        alignItems: "center",
      }}
    >
      {status === "loading" && (
        <span style={{ paddingLeft: 20, fontSize: 12, color: "var(--muted)" }}>
          Loading live prices…
        </span>
      )}
      {status === "error" && (
        <span style={{ paddingLeft: 20, fontSize: 12, color: "var(--coral)" }}>
          Price feed unavailable — retrying…
        </span>
      )}
      <div
        ref={tapeRef}
        className="mono"
        style={{ display: "flex", gap: 32, whiteSpace: "nowrap", paddingLeft: 20, fontSize: 12.5 }}
      >
        {items.map((s, i) => (
          <div key={i}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>{s.pair}</span>
            <span className={s.change24h >= 0 ? "up" : "down"}>
              {s.price === null ? "—" : `$${fmt(s.price, s.price < 10 ? 4 : 2)}`}{" "}
              {s.change24h === null ? "" : `${s.change24h >= 0 ? "▲" : "▼"} ${Math.abs(s.change24h).toFixed(2)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
