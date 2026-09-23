"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import anime from "animejs";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const cardRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [connecting, setConnecting] = useState(false);
  const [wallet, setWallet] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 500,
      easing: "easeOutQuad",
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Enter an email and password to continue.");
      return;
    }

    try {
      setLoading(true);

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function connectWallet() {
    setError("");

    if (typeof window === "undefined" || !window.ethereum) {
      setError(
        "No wallet extension detected. Install MetaMask to connect, or sign in with email."
      );
      return;
    }

    try {
      setConnecting(true);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWallet(accounts[0]);

      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err) {
      setError("Wallet connection was cancelled.");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 20% 20%, rgba(45,212,191,0.08), transparent 40%), radial-gradient(circle at 80% 80%, rgba(251,106,106,0.06), transparent 40%), var(--bg)",
        padding: 20,
      }}
    >
      <div
        ref={cardRef}
        className="card"
        style={{
          width: 380,
          padding: 32,
          opacity: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background:
                "linear-gradient(135deg, var(--mint), var(--mint-dim))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#04120F",
            }}
          >
            N
          </div>

          <span
            style={{
              fontWeight: 800,
              fontSize: 19,
            }}
          >
            NOVA
          </span>
        </div>

        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          Sign in
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "var(--muted)",
            marginBottom: 22,
          }}
        >
          Gateway to financial freedom
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11.5,
                color: "var(--muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 11.5,
                color: "var(--muted)",
                display: "block",
                marginBottom: 5,
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--coral)",
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              marginTop: 6,
              width: "100%",
            }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            margin: "18px 0",
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--line)",
            }}
          />

          <span
            style={{
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            OR
          </span>

          <div
            style={{
              flex: 1,
              height: 1,
              background: "var(--line)",
            }}
          />
        </div>

        <button
          onClick={connectWallet}
          className="btn-ghost"
          style={{
            width: "100%",
          }}
          disabled={connecting}
        >
          {connecting
            ? "Connecting..."
            : wallet
              ? `Connected: ${wallet.slice(0, 6)}…${wallet.slice(-4)}`
              : "Connect Wallet"}
        </button>

        <p
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Don't have an account?{" "}
          <a
            href="/signup"
            style={{
              color: "var(--mint)",
              textDecoration: "none",
            }}
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--panel-2)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  padding: "9px 11px",
  color: "var(--text)",
  fontSize: 13.5,
  outline: "none",
};

