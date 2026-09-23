// Coin universe for the terminal. `id` = CoinGecko coin id (used server-side),
// `symbol` = ticker shown in the UI.
export const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", pair: "BTC/USDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", pair: "ETH/USDT" },
  { id: "solana", symbol: "SOL", name: "Solana", pair: "SOL/USDT" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", pair: "AVAX/USDT" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", pair: "LINK/USDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", pair: "XRP/USDT" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", pair: "DOGE/USDT" },
];

export const COIN_IDS = COINS.map((c) => c.id).join(",");
