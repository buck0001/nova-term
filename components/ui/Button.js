export default function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button type={type} className={`${variant === "primary" ? "btn-primary" : "btn-ghost"} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
