export default function Card({ children, className = "", padding = 20, style, ...props }) {
  return (
    <section className={`card ${className}`.trim()} style={{ padding, ...style }} {...props}>
      {children}
    </section>
  );
}
