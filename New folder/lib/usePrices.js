"use client";

import { useEffect, useRef, useState } from "react";

// Polls our own /api/prices route (which proxies CoinGecko) every `intervalMs`.
export function usePrices(intervalMs = 200000) {
  const [prices, setPrices] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [updatedAt, setUpdatedAt] = useState(null);
  const timer = useRef(null);

  async function fetchPrices() {
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      const data = await res.json();
      if (data.prices && data.prices.length) {
        setPrices(data.prices);
        setStatus("ok");
      } else {
        setStatus("error");
      }
      setUpdatedAt(data.updatedAt || Date.now());
    } catch (err) {
      setStatus("error");
    }
  }

  useEffect(() => {
    fetchPrices();
    timer.current = setInterval(fetchPrices, intervalMs);
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { prices, status, updatedAt, refresh: fetchPrices };
}
