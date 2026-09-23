export default function BrandMark({ name = "NOVA", mark = "N", showName = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          borderRadius: 6,
          background: "linear-gradient(135deg, var(--mint), var(--mint-dim))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          color: "#04120F",
          fontSize: 14,
        }}
      >
        {mark}
      </div>
      {showName && <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: 0.4 }}>{name}</span>}
    </div>
  );
}
