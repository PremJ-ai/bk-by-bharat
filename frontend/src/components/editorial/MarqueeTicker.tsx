export function MarqueeTicker() {
  const items = [
    "BELGIAN MASTERS OF LINEN",
    "GIZA 87 EXTRA-LONG STAPLE COTTON",
    "HAND-CARVED BUFFALO HORN BUTTONS",
    "REINFORCED SINGLE-NEEDLE TAILORING",
    "NATURAL DYES & ZERO SYNTHETICS",
    "COMPLIMENTARY ALTERATION SERVICE",
  ];

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Fabric and craftsmanship features. Focus or hover to pause."
      className="marquee-container bg-surface-muted border-b border-border py-3.5 overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-focus select-none"
    >
      <span className="sr-only">{items.join(". ")}</span>
      <div aria-hidden="true" className="animate-ticker flex space-x-12 whitespace-nowrap text-xs uppercase tracking-[0.2em] text-muted font-medium">
        {/* Repeat twice for continuous loop effect */}
        {[...items, ...items].map((text, idx) => (
          <div key={idx} className="flex items-center space-x-12">
            <span>{text}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-gold/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
