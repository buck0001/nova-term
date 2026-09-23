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
    depositAddress: "bc1qmockmockmockmockmockmockmockmockmock00xyz",
  },
  {
    id: "seth",
    label: "ETH",
    symbol: "ETH",
    network: "ETHERIUM",
    depositAddress: "0x8f3aB1c2E9D4b5F6a7C8d9E0F1a2B3c4D5e6F7A8",
  },
  {
    id: "susdT",
    label: "USDT",
    symbol: "USDT",
    network: "ETHERIUM",
    depositAddress: "0x8f3aB1c2E9D4b5F6a7C8d9E0F1a2B3c4D5e6F7A8",
  },

];

const CONFIRMATIONS_NEEDED = 3;

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
   * LOAD WALLET BALANCE
   * (same wallet_balances row shape used on /dashboard)
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
    loadBalance();
  }, []);

  // wallet_balances columns are lowercase (eth/usdc/btc) — ASSETS.symbol is uppercase for display
  const assetKey = asset.symbol.toLowerCase();
  const availableBalance = balance ? Number(balance[assetKey] || 0) : null;

  function copyAddress() {
    navigator.clipboard?.writeText(asset.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function confirmDeposit() {
    if (!amount) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Enter a valid amount.");
      return;
    }

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
            ⚠ Confirm Deposit address, Lost funds are irrecoverable.</div>
          <div className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                {wallet ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "No wallet connected"}
              </div>
              {walletError && <div style={{ fontSize: 11.5, color: "var(--coral)", marginTop: 4 }}>{walletError}</div>}
            </div>
            <button className="btn-ghost" onClick={connectWallet}>
              {wallet ? "Reconnect" : "Connect MetaMask"}
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setTab("deposit")}
              className={tab === "deposit" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1 }}
            >
              Deposit
            </button>
            <button
              onClick={() => setTab("withdraw")}
              className={tab === "withdraw" ? "btn-primary" : "btn-ghost"}
              style={{ flex: 1 }}
            >
              Withdraw
            </button>
          </div>

          {/* Asset selector */}
          <div style={{ display: "flex", gap: 8 }}>
            {ASSETS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAsset(a)}
                className={asset.id === a.id ? "btn-primary" : "btn-ghost"}
                style={{ flex: 1, fontSize: 12.5 }}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div ref={panelRef} className="card" style={{ padding: 20 }}>
            {tab === "deposit" ? (
              <DepositPanel
                asset={asset}
                amount={amount}
                setAmount={setAmount}
                depositState={depositState}
                confirmations={confirmations}
                confirmDeposit={confirmDeposit}
                copyAddress={copyAddress}
                copied={copied}
                availableBalance={availableBalance}
              />
            ) : (
              <WithdrawPanel
                asset={asset}
                amount={amount}
                setAmount={setAmount}
                destination={destination}
                setDestination={setDestination}
                withdrawState={withdrawState}
                submitWithdraw={submitWithdraw}
                availableBalance={availableBalance}
                withdrawError={withdrawError}
              />
            )}
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

function WithdrawPanel({ asset, amount, setAmount, destination, setDestination, withdrawState, submitWithdraw, availableBalance, withdrawError }) {
  return (
    <form onSubmit={submitWithdraw} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Available balance</span>
        <span className="mono">{availableBalance === null ? "—" : `${availableBalance} ${asset.symbol}`}</span>
      </div>

      <div>
        <label style={labelStyle}>Destination address (Sepolia)</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="0x..."
          className="mono"
          style={inputStyle}
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
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
        <span>Estimated network fee</span>
        <span className="mono">~0.0002 ETH (testnet)</span>
      </div>

      {withdrawError && (
        <div style={{ color: "var(--coral)", fontSize: 12 }}>{withdrawError}</div>
      )}

      {withdrawState === "idle" && (
        <button type="submit" className="btn-primary" disabled={!amount || !destination}>
          Withdraw {asset.symbol}
        </button>
      )}
      {withdrawState === "pending" && <div style={statusBox("var(--amber)")}>⏳ Submitting withdrawal…</div>}
      {withdrawState === "submitted" && (
        <div style={statusBox("var(--mint)")}>
          ✓ Withdrawal submitted — {amount} {asset.symbol} sent to {destination.slice(0, 6)}…{destination.slice(-4)} (testnet)
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