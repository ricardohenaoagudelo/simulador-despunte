export function Button({
  className = "",
  children,
  variant,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center px-4 py-2 font-medium transition";

  const variants = {
    default: "bg-slate-900 text-white hover:opacity-90",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  };

  return (
    <button
      className={`${base} ${variants[variant || "default"]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}