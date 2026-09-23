# NOVA — Market Terminal (Next.js demo)

A crypto trading terminal UI built with Next.js 14 (App Router). Live prices are
pulled from the CoinGecko public API through two internal API routes. This
version is a self-contained demo: there is no authentication, database, real
wallet, deposit, withdrawal, or trading integration.

## Pages

- `/login` — optional demo entry screen; no account is required.
- `/dashboard` — portfolio summary, live ticker tape, live watchlist, and a
  real 24h price chart (pulled from CoinGecko `market_chart`).
- `/bots` — 5 example trading bots (Grid, DCA, Trend Follower, Mean Reversion,
  Breakout Scalper), each with a short plain-English explanation of its logic,
  an on/off toggle, and an illustrative "simulated" P&L derived from the real
  24h price change. **No real orders are ever placed.**
- `/wallet` — visual-only wallet page with deposits and withdrawals disabled.

## Live price data

- `GET /api/prices` → proxies CoinGecko `simple/price` for a fixed coin list
  (BTC, ETH, SOL, AVAX, LINK, XRP, DOGE), refreshed client-side every 20s.
- `GET /api/history?id=<coin>&days=1` → proxies CoinGecko `market_chart` for
  the dashboard's price line.

Both routes are `force-dynamic` so they always fetch fresh data per request
and are never baked in at build time. CoinGecko's public endpoint has no key
requirement, but it is rate-limited — if you hit the limit the UI will show a
"price feed unavailable" state instead of crashing.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 (it opens the demo dashboard).

To build for production:

```bash
npm run build
npm start
```

## Reusable NOVA style components

The visual system is available from `components/ui` for reuse in other pages
or projects that copy the component files and `globals.css` tokens:

```jsx
import { Banner, Button, Card, PageHeader, Section, StatCard } from "@/components/ui";

export default function ExamplePage() {
  return (
    <div className="page-pad">
      <PageHeader title="Overview" description="Compact terminal-style content." />
      <Banner>Testnet environment</Banner>
      <div className="summary-grid">
        <StatCard label="Balance" value="$12,480" detail="+4.2%" trend="up" />
      </div>
      <Section title="Activity">
        <Card>Reusable bordered panel content.</Card>
      </Section>
      <Button>Continue</Button>
    </div>
  );
}
```

The components use the existing CSS variables (`--bg`, `--panel`, `--line`,
`--text`, `--muted`, `--mint`, `--coral`, and `--amber`) and work with the
existing dark/light theme switch.

## Notes / next steps

- The bot "P&L" numbers are cosmetic (derived from live 24h % change) — hook
  up real order logic only once you're ready to test against a real exchange
  testnet API or a smart contract.
