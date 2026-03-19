export function Badge({ className = "", children }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}