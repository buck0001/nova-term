"use client";

import { useEffect, useState } from "react";

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
          NOVA-LEGACY
        </span>
        <div
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
          }}
        >

        </div>
      </div>
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
