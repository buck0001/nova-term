import { NextResponse } from "next/server";
import { COINS, COIN_IDS } from "@/lib/coins";

// Always run on request — never statically cached at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COIN_IDS}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const res = await fetch(url, {
      // CoinGecko's free tier is fine with a short revalidate window;
      // force-dynamic above already guarantees no build-time fetch.
      next: { revalidate: 15 },
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`CoinGecko responded ${res.status}`);
    }

    const data = await res.json();

    const prices = COINS.map((c) => {
      const entry = data[c.id];
      return {
        id: c.id,
        symbol: c.symbol,
        name: c.name,
        pair: c.pair,
        price: entry?.usd ?? null,
        change24h: entry?.usd_24h_change ?? null,
      };
    });

    return NextResponse.json({ prices, updatedAt: Date.now(), source: "coingecko" });
  } catch (err) {
    // If CoinGecko is unreachable (rate limit, network, etc.) fail soft
    // so the UI can show a "stale data" state instead of crashing.
    return NextResponse.json(
      { prices: [], updatedAt: Date.now(), source: "error", error: String(err) },
      { status: 502 }
    );
  }
}
