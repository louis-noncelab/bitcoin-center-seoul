import "@/styles/loading.css";

export function ButtonSpinner({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className ? `button-spinner ${className}` : "button-spinner"}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
