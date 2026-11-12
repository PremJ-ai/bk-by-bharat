import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-canvas py-16 px-6 md:px-12 border-t border-navy-strong">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        <div className="space-y-4">
          <span className="font-display text-2xl font-normal tracking-tight block">BK BY BHARAT</span>
          <p className="text-canvas/60 text-sm leading-relaxed max-w-xs font-sans">
            Considered menswear essentials, refined fabrics and thoughtful tailoring for everyday occasions.
          </p>
        </div>

        <div>
          <h5 className="text-xs uppercase tracking-caps text-gold font-medium mb-4">Collections</h5>
          <ul className="space-y-2.5 text-sm text-canvas/70 font-sans">
            <li><Link href="/collections/shirts" className="hover:text-canvas transition-colors">Shirts &amp; Overshirts</Link></li>
            <li><Link href="/collections/trousers" className="hover:text-canvas transition-colors">Formal Pants &amp; Chinos</Link></li>
            <li><Link href="/collections/tailoring" className="hover:text-canvas transition-colors">Tailoring</Link></li>
            <li><Link href="/collections/all" className="hover:text-canvas transition-colors">All Works</Link></li>
          </ul>
        </div>

        <div>
          <h5 className="text-xs uppercase tracking-caps text-gold font-medium mb-4">Customer Care</h5>
          <ul className="space-y-2.5 text-sm text-canvas/70 font-sans">
            <li><Link href="/policies/shipping" className="hover:text-canvas transition-colors">Shipping &amp; Delivery</Link></li>
            <li><Link href="/policies/returns" className="hover:text-canvas transition-colors">Returns &amp; Alterations</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-canvas transition-colors">Privacy Policy</Link></li>
            <li><a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-canvas transition-colors">WhatsApp Concierge</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-canvas/40 space-y-4 sm:space-y-0">
        <span>&copy; {new Date().getFullYear()} BK by Bharat. All rights reserved.</span>
        <span>Thoughtfully made for everyday dressing.</span>
      </div>
    </footer>
  );
}
