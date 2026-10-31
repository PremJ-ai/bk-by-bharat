import { Images, PackageCheck, ShoppingBag, Ruler } from "lucide-react";

const highlights = [
  {
    icon: ShoppingBag,
    title: "Guest checkout",
    description: "Place an order without creating a customer account.",
  },
  {
    icon: Images,
    title: "Product galleries",
    description: "Review available product images and video before choosing a piece.",
  },
  {
    icon: Ruler,
    title: "Size selection",
    description: "See size options and current availability on each product page.",
  },
  {
    icon: PackageCheck,
    title: "Order summary",
    description: "Review your selected items and delivery details during checkout.",
  },
];

export function ServiceHighlights() {
  return (
    <section className="border-b border-border bg-surface py-16 md:py-20">
      <div className="mx-auto max-w-[1440px] px-6 md:px-12">
        <div className="mb-10 max-w-xl">
          <span className="mb-2 block text-xs uppercase tracking-caps text-gold">Shopping at the atelier</span>
          <h2 className="font-display text-3xl text-ink md:text-4xl">A considered experience, from browse to order.</h2>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-border bg-surface-muted text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-medium text-ink">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
