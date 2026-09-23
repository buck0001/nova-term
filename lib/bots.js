// Single source of truth for the 5 bots. Both /app/bots/page.js and
// /app/dashboard/page.js import from here instead of keeping their own
// copies — previously the two files each hard-coded their own version of
// this list, so it was possible for the two pages to disagree about a
// bot's name/pair without anyone noticing.
export const BOT_DEFS = [
  {
    id: "grid",
    name: "Grid Bot",
    pair: "BTC/USDT",
    logic:
      "Places buy and sell orders at fixed price steps above and below the current price. Buys each time price falls one grid step, sells each time it rises one step.",
    param: { label: "Grid step", value: "0.5%" },
  },
  {
    id: "dca",
    name: "DCA Bot",
    pair: "ETH/USDT",
    logic:
      "Buys a fixed dollar amount on a fixed schedule, regardless of price, to average the entry cost over time instead of timing the market.",
    param: { label: "Buy interval", value: "Every 4h" },
  },
  {
    id: "trend",
    name: "Trend Follower",
    pair: "SOL/USDT",
    logic:
      "Watches a short and a long moving average. Buys when the short average crosses above the long one, sells when it crosses back below.",
    param: { label: "MA crossover", value: "9 / 21" },
  },
  {
    id: "meanrev",
    name: "Mean Reversion",
    pair: "AVAX/USDT",
    logic:
      "Buys when price drops well below its recent average, on the assumption it will bounce back, then sells once price returns to that average.",
    param: { label: "Deviation trigger", value: "2.5%" },
  },
  {
    id: "breakout",
    name: "Breakout Scalper",
    pair: "LINK/USDT",
    logic:
      "Buys when price breaks above its recent high by a small margin, then exits quickly at a fixed profit target or stop-loss.",
    param: { label: "Breakout margin", value: "0.8%" },
  },
];

// Fallback state used only until the real per-user rows load from
// `user_bots` (or for a bot that has never been toggled by this user yet).
export const DEFAULT_ACTIVE_BOTS = {
  grid: true,
  dca: true,
  trend: false,
  meanrev: false,
  breakout: false,
};
