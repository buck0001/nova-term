import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// /api/history?id=bitcoin&days=1
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "bitcoin";
  const days = searchParams.get("days") || "1";

  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const data = await res.json();
    // data.prices = [[timestamp, price], ...] -> thin it out to ~80 points
    const raw = data.prices || [];
    const step = Math.max(1, Math.floor(raw.length / 80));
    const points = raw.filter((_, i) => i % step === 0).map(([t, p]) => ({ t, p }));

    return NextResponse.json({ id, points, source: "coingecko" });
  } catch (err) {
    return NextResponse.json({ id, points: [], source: "error", error: String(err) }, { status: 502 });
  }
}
