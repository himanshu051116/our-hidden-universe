export default function GlowButton({ children, className = '', ...props }) {
  return (
    <button
      className={`aurora-border rounded-full bg-gradient-to-r from-blush to-roseGold px-6 py-3 font-semibold text-midnight shadow-glow transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-blush/60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
