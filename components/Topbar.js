"use client";

import { useEffect, useState } from "react";

export default function Topbar({ title }) {
  return (
    <div className="topbar">
      <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ThemeToggle />
        <span className="mono topbar-badge">DEMO</span>
        <div className="avatar" aria-label="Demo account">D</div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("nova-theme");
    if (stored === "light") {
      setTheme("light");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      window.localStorage.setItem("nova-theme", next);
      return next;
    });
  }

  const light = theme === "light";
  return (
    <button className="theme-toggle mono" onClick={toggleTheme} aria-label={light ? "Switch to dark mode" : "Switch to light mode"}>
      {light ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
