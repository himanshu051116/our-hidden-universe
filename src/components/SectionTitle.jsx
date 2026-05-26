export default function SectionTitle({ overline, title, subtitle }) {
  return (
    <header className="mb-6 space-y-2">
      <p className="text-xs uppercase tracking-[0.22em] text-roseGold/90">{overline}</p>
      <h2 className="font-display text-3xl leading-tight text-white sm:text-4xl">{title}</h2>
      {subtitle ? <p className="max-w-2xl text-sm text-pink-100/80 sm:text-base">{subtitle}</p> : null}
    </header>
  );
}
