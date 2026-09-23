# NOVA — Market Terminal (Next.js demo)

A crypto trading terminal UI built with Next.js 14 (App Router). Live prices are
pulled from the CoinGecko public API through two internal API routes. Everything
else (balances, bots, deposits/withdrawals) is simulated **testnet-only** data —
no real funds or real trades are involved anywhere in this app.

## Pages

- `/login` — email/password form + a "Connect Wallet" button (MetaMask, optional).
- `/dashboard` — portfolio summary, live ticker tape, live watchlist, and a
  real 24h price chart (pulled from CoinGecko `market_chart`).
- `/bots` — 5 example trading bots (Grid, DCA, Trend Follower, Mean Reversion,
  Breakout Scalper), each with a short plain-English explanation of its logic,
  an on/off toggle, and an illustrative "simulated" P&L derived from the real
  24h price change. **No real orders are ever placed.**
- `/wallet` — Deposit / Withdraw flow for **Sepolia ETH** and **Sepolia USDC**
  only, clearly labeled testnet-only, with an optional MetaMask connect +
  auto network-switch to Sepolia.

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

Then open http://localhost:3000 (it redirects to `/login`).

To build for production:

```bash
npm run build
npm start
```

## Notes / next steps

- Swap the dummy `DEPOSIT_ADDRESS` in `app/wallet/page.js` for a real address
  you control on Sepolia if you want to demo an actual on-chain deposit flow.
- The bot "P&L" numbers are cosmetic (derived from live 24h % change) — hook
  up real order logic only once you're ready to test against a real exchange
  testnet API or a smart contract.
- Auth is not real — `/login` just navigates to `/dashboard` on submit. Wire
  up Supabase (like your other projects) or NextAuth if you want real
  sessions.
