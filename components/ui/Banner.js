export default function Banner({ children, tone = "warning", className = "" }) {
  const toneClass = tone === "error" ? "banner-error" : tone === "success" ? "banner-success" : "testnet-banner";

  return <div className={`${toneClass} ${className}`.trim()}>{children}</div>;
}
