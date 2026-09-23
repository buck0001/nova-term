export default function StatCard({ label, value, detail, trend, tone = "default" }) {
  const trendClass = trend === "up" ? "up" : trend === "down" ? "down" : "";

  return (
    <div className="card stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${tone === "mono" ? "mono" : ""}`}>{value}</div>
      {(detail || trend) && <div className={`stat-card-detail ${trendClass}`}>{detail || trend}</div>}
    </div>
  );
}
