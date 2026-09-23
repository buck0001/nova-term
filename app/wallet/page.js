"use client";

import { useEffect, useRef, useState } from "react";
import anime from "animejs";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import TickerTape from "@/components/TickerTape";
import { usePrices } from "@/lib/usePrices";
import { createClient } from "@/lib/supabase/client";

// Sepolia is chainId 11155111 (0xaa36a7)
const SEPOLIA_CHAIN_ID = "0xaa36a7";

const ASSETS = [
  {
    id: "btc",
    label: "BTC",
    symbol: "BTC",
    network: "BITCOIN",
    depositAddress: "bc1pegkt4gkuqcu0l5r75vgt8mxfx2pe3vpxxg92ewe6tjah54dm7pyqe06350",
  },
  {
    id: "seth",
    label: "ETH",
    symbol: "ETH",
    network: "ETHERIUM",
    depositAddress: "0xc744b98bf14b2e8d6545e9f8faa5e507d9186bf1",
  },
  {
    id: "susdT",
    label: "USDT",
    symbol: "USDT",
    network: "ETHERIUM",
    depositAddress: "0xc744b98bf14b2e8d6545e9f8faa5e507d9186bf1",
  },

];

const CONFIRMATIONS_NEEDED = 3;
const MIN_DEPOSIT_USD = 380;
const WALLET_TRANSFERS_ENABLED = false;

// `wallet_balances` columns are eth / usdc / btc — but the asset the user
// picks on this page is labelled "USDT", not "USDC". Previously the code
// derived the column name by lowercasing the symbol (`"USDT".toLowerCase()`
// -> "usdt"), which doesn't exist as a column, so the USDT balance always
// read as 0 and deposits/withdrawals for it were sent to the backend with
// the wrong asset key. BTC and ETH happened to line up already (their
// symbol lowercases straight to the real column name), which is why only
// USDT looked broken. This map makes the column lookup explicit for every
// asset instead of relying on the symbol matching by coincidence.
const ASSET_BALANCE_KEY = {
  BTC: "btc",
  ETH: "eth",
  USDT: "usdc",
};

export default function WalletPage() {
  const supabase = createClient();
  const { prices, status } = usePrices();
  const [tab, setTab] = useState("deposit");
  const [asset, setAsset] = useState(ASSETS[0]);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [depositState, setDepositState] = useState("idle"); // idle | pending | confirmed
  const [withdrawState, setWithdrawState] = useState("idle"); // idle | pending | submitted
  const [withdrawError, setWithdrawError] = useState("");
  const [copied, setCopied] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [confirmations, setConfirmations] = useState(0);
  const [balance, setBalance] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    anime({
      targets: panelRef.current,
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 400,
      easing: "easeOutQuad",
    });
  }, [tab]);

  /*
   * ============================================
   * LOAD WALLET BALANCE + REALTIME UPDATES
   * (same wallet_balances row shape used on /dashboard, and the same
   * realtime + polling-fallback pattern, so a deposit made here shows up
   * on /dashboard immediately, and vice versa)
   * ============================================
   */
  async function loadBalance() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("wallet_balances")
      .select("eth, usdc, btc")
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Balance error:", error);
      return;
    }

    setBalance(data);
  }

  useEffect(() => {
    let channel = null;
    let mounted = true;

    async function init() {
      await loadBalance();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const channelName = `wallet-page-balance-${user.id}-${Date.now()}`;

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
        )
        .subscribe();
    }

    init();

    const poll = setInterval(loadBalance, 15000);

    function onVisible() {
      if (document.visibilityState === "visible") loadBalance();
    }

    window.addEventListener("focus", loadBalance);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearInterval(poll);
      window.removeEventListener("focus", loadBalance);
      document.removeEventListener("visibilitychange", onVisible);

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Explicit column lookup (see ASSET_BALANCE_KEY above) instead of
  // naively lowercasing the symbol.
  const assetKey = ASSET_BALANCE_KEY[asset.symbol] || asset.symbol.toLowerCase();
  const availableBalance = balance ? Number(balance[assetKey] || 0) : null;

  function copyAddress() {
    navigator.clipboard?.writeText(asset.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function confirmDeposit() {
    if (!WALLET_TRANSFERS_ENABLED) return;
    if (!amount) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    // --- Minimum deposit check ($100 USD equivalent, pegged to live BTC price) ---
    const btcEntry = prices.find((p) => p.symbol?.toUpperCase() === "BTC");
    const btcPrice = btcEntry?.price;

    if (!btcPrice) {
      alert("Price data not loaded yet — please wait a moment and try again.");
      return;
    }

    const minBtcUnits = MIN_DEPOSIT_USD / btcPrice;

    if (asset.symbol === "BTC" && numericAmount < minBtcUnits) {
      alert(`Minimum deposit is $${MIN_DEPOSIT_USD} (≈ ${minBtcUnits.toFixed(6)} BTC).`);
      return;
    }
    if (asset.symbol === "USDT" && numericAmount < MIN_DEPOSIT_USD) {
      alert(`Minimum deposit is $${MIN_DEPOSIT_USD}.`);
      return;
    }
    // --- end minimum deposit check ---

    setDepositState("pending");
    setConfirmations(0);

    let count = 0;
    const nextTick = () => {
      const delay = 140000 + Math.random() * 140000; // ~140–280s per confirmation
      setTimeout(async () => {
        count += 1;
        setConfirmations(count);

        if (count >= CONFIRMATIONS_NEEDED) {
          const { error } = await supabase.rpc("credit_deposit", {
            p_asset: assetKey,
            p_amount: numericAmount,
          });

          if (error) {
            console.error(error);
            alert(`Deposit confirmed on-chain but crediting your balance failed: ${error.message}`);
            setDepositState("idle");
            return;
          }

          setDepositState("confirmed");
          loadBalance();
        } else {
          nextTick();
        }
      }, delay);
    };
    nextTick();
  }

  async function submitWithdraw(e) {
    e.preventDefault();

    if (!WALLET_TRANSFERS_ENABLED) return;

    setWithdrawError("");

    if (!amount || !destination) return;

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

    if (availableBalance !== null && numericAmount > availableBalance) {
      setWithdrawError(`Insufficient balance — you have ${availableBalance} ${asset.symbol} available.`);
      return;
    }

    setWithdrawState("pending");

    try {
      const { error } = await supabase.rpc("create_withdrawal", {
        p_asset: assetKey,
        p_amount: numericAmount,
        p_destination: destination.trim(),
      });

      if (error) {
        console.error(error);
        setWithdrawError(error.message);
        setWithdrawState("idle");
        return;
      }

      setWithdrawState("submitted");
      setAmount("");
      setDestination("");
      loadBalance();

    } catch (error) {
      console.error(error);
      setWithdrawError("Withdrawal failed.");
      setWithdrawState("idle");
    }
  }
  async function connectWallet() {
    setWalletError("");
    if (typeof window === "undefined" || !window.ethereum) {
      setWalletError("No wallet extension detected. Install MetaMask to connect.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWallet(accounts[0]);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch (switchErr) {
        setWalletError("Connected, but couldn't switch to Sepolia automatically. Please switch networks manually.");
      }
    } catch (err) {
      setWalletError("Wallet connection was cancelled.");
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar title="Deposit / Withdraw" />
        <TickerTape prices={prices} status={status} />

        <div className="page-pad" style={{ maxWidth: 560 }}>
          <div className="testnet-banner">
            ⚠ Deposits and withdrawals are disabled.
          </div>

          <div ref={panelRef} className="card" style={{ padding: 20 }}>
            <div style={{ textAlign: "center", color: "var(--muted)", lineHeight: 1.6 }}>
              <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 8 }}>
                Deposits and withdrawals are currently unavailable.
              </div>
              Please check back later.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DepositPanel({ asset, amount, setAmount, depositState, confirmations, confirmDeposit, copyAddress, copied, availableBalance }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Current balance</span>
        <span className="mono">{availableBalance === null ? "—" : `${availableBalance} ${asset.symbol}`}</span>
      </div>

      <div>
        <label style={labelStyle}>Deposit address ({asset.label})</label>
        <div
          className="mono"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--panel-2)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            gap: 10,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{asset.depositAddress}</span>
          <button onClick={copyAddress} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          Only send {asset.label} on {asset.network} to this address. Sending any other asset or network will result in permanent loss .
        </p>
      </div>

      <div>
        <label style={labelStyle}>Amount ({asset.symbol})</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mono"
          style={inputStyle}
        />
      </div>

      {depositState === "idle" && (
        <button className="btn-primary" onClick={confirmDeposit} disabled={!amount}>
          I&apos;ve sent the funds
        </button>
      )}
      {depositState === "pending" && (
        <div style={statusBox("var(--amber)")}>
          ⏳ Waiting for network confirmation… ({confirmations}/{CONFIRMATIONS_NEEDED})
        </div>
      )}
      {depositState === "confirmed" && (
        <div style={statusBox("var(--mint)")}>
          ✓ Deposit confirmed — {amount} {asset.symbol} credited (testnet)
        </div>
      )}
    </div>
  );
}

// Withdrawal fee: kept simple and deducted from the user's own balance —
// no separate fee wallet/address involved. FEE_RATE/FEE_FLOOR are placeholders,
// wire to whatever number the mod actually wants.
const FEE_RATE = 0.015; // 1.5%
const FEE_FLOOR = 5;
const WITHDRAWAL_WAIT_SECONDS = 10 * 60; // 10 minutes, shown as a visible countdown

function WithdrawPanel({
  asset,
  amount,
  setAmount,
  destination,
  setDestination,
  withdrawState,
  setWithdrawState,
  copyAddress,
  submitWithdraw,
  availableBalance,
  withdrawError,
  setWithdrawError,
}) {
  const MIN_WITHDRAW = 400;
  const [secondsLeft, setSecondsLeft] = useState(WITHDRAWAL_WAIT_SECONDS);
  const intervalRef = useRef(null);

  const numericAmount = parseFloat(amount) || 0;
  const fee = numericAmount > 0 ? Math.max(numericAmount * FEE_RATE, FEE_FLOOR) : 0;
  const netAmount = Math.max(numericAmount - fee, 0);

  useEffect(() => {
    if (withdrawState === "pending") {
      setSecondsLeft(WITHDRAWAL_WAIT_SECONDS);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [withdrawState]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (parseFloat(amount) < MIN_WITHDRAW) {
      setWithdrawError(`Minimum withdrawable amount is $${MIN_WITHDRAW}`);
      return;
    }

    // submitWithdraw does the real work (RPC call) and will itself set
    // withdrawState to "pending" -> "submitted"/"idle". We only add a visible
    // countdown on top of that pending state, no separate fake timer.
    await submitWithdraw(e);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Available balance</span>
        <span className="mono">{availableBalance === null ? "—" : `${availableBalance} ${asset.symbol}`}</span>
      </div>

      <div>
        <label style={labelStyle}>Destination address</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="0x..."
          className="mono"
          style={inputStyle}
          disabled={withdrawState === "pending"}
        />
      </div>

      <div>
        <label style={labelStyle}>Amount ({asset.symbol})</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mono"
          style={inputStyle}
          disabled={withdrawState === "pending"}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Withdrawal fee</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{asset.depositAddress}</span>
        <button onClick={copyAddress} className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11 }}>
          {copied ? "Copied" : "Copy"}
        </button>
        <span className="mono">{fee.toFixed(2)} {asset.symbol}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600 }}>
        <span>You'll receive</span>
        <span className="mono">{netAmount.toFixed(2)} {asset.symbol}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Estimated network fee</span>
        <span className="mono">~0.0002 BTC</span>
      </div>

      {/* Minimum withdrawal notice */}
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
        Minimum withdrawal: <span className="mono">${MIN_WITHDRAW}</span>
      </div>

      {withdrawError && (
        <div style={{ color: "var(--coral)", fontSize: 12 }}>{withdrawError}</div>
      )}

      {withdrawState === "idle" && (
        <button type="submit" className="btn-primary" disabled={!amount || !destination}>
          Withdraw {asset.symbol}
        </button>
      )}
      {withdrawState === "pending" && (
        <div style={statusBox("var(--amber)")}>
          ⏳ Your withdrawal is processing. This can take up to 10 minutes — please don't close this page.
          <div className="mono" style={{ fontSize: 18, marginTop: 6 }}>
            {mm}:{ss}
          </div>
        </div>
      )}
      {withdrawState === "submitted" && (
        <div style={statusBox("var(--mint)")}>
          ✓ Withdrawal submitted — {netAmount.toFixed(2)} {asset.symbol} sent to {destination.slice(0, 6)}…{destination.slice(-4)} (fee: {fee.toFixed(2)} {asset.symbol})
        </div>
      )}
    </form>
  );
}

const labelStyle = { fontSize: 11.5, color: "var(--muted)", display: "block", marginBottom: 6 };

const inputStyle = {
  width: "100%",
  background: "var(--panel-2)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "10px 12px",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};

function statusBox(color) {
  return {
    border: `1px solid ${color}55`,
    background: `${color}18`,
    color,
    padding: "10px 12px",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
  };
}
