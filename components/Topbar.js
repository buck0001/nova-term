"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Topbar({ title }) {
  return (
    <div
      style={{
        height: 56,
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        padding: "0 22px",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        <span
          className="mono"
          style={{
            fontSize: 11.5,
            color: "var(--muted)",
            border: "1px solid var(--line)",
            borderRadius: 6,
            padding: "5px 9px",
          }}
        >
          NOVA
        </span>
        <ProfileMenu />
      </div>
    </div>
  );
}

// Avatar button + dropdown showing the signed-in user's email and a
// sign-out action. Closes on outside click or Escape, matching the
// self-contained pattern ThemeToggle already uses in this file.
function ProfileMenu() {
  const router = useRouter();
  const [email, setEmail] = useState(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data?.user?.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onEscape(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = email ? email[0].toUpperCase() : "";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "var(--panel-2)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            width: 220,
            padding: 10,
            zIndex: 50,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "var(--muted)",
              padding: "2px 6px 6px",
            }}
          >
            Signed in as
          </div>

          <div
            className="mono"
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              padding: "0 6px 10px",
              wordBreak: "break-all",
            }}
          >
            {email || "—"}
          </div>

          <div style={{ height: 1, background: "var(--line)", margin: "0 0 8px" }} />

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mono"
            style={{
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              color: "var(--coral)",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "6px",
              cursor: "pointer",
              borderRadius: 6,
            }}
          >
            {loggingOut ? "Signing out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}

// Self-contained toggle: reads/writes localStorage directly and flips
// the data-theme attribute on <html>. No context/provider needed since
// globals.css drives everything off that one attribute.
function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("nova-theme");
    if (stored === "light") setTheme("light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      window.localStorage.setItem("nova-theme", next);
      return next;
    });
  }

  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className="mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "var(--panel-2)",
        border: "1px solid var(--line)",
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 11.5,
        fontWeight: 600,
        color: "var(--text)",
      }}
    >
      <span aria-hidden="true">{isLight ? "☀️" : "🌙"}</span>
      {isLight ? "Light" : "Dark"}
    </button>
  );
}
