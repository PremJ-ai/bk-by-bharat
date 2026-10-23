import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-canvas py-16 px-6 md:px-12 border-t border-navy-strong">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand Col */}
        <div className="space-y-4">
          <span className="font-display text-2xl font-normal tracking-tight block">BHARAT</span>
          <p className="text-canvas/60 text-sm leading-relaxed max-w-xs font-sans">
            Independent menswear atelier crafting durable tailored essentials from rare natural fibers.
          </p>
          <p className="text-canvas/40 text-xs font-sans">
            Shahpur Jat &middot; New Delhi &middot; 110049
          </p>
        </div>

        {/* Collections */}
        <div>
          <h5 className="text-xs uppercase tracking-caps text-gold font-medium mb-4">
            Collections
          </h5>
          <ul className="space-y-2.5 text-sm text-canvas/70 font-sans">
            <li>
              <Link href="/collections/shirts" className="hover:text-canvas transition-colors">
                Camp-Collar Shirts
              </Link>
            </li>
            <li>
              <Link href="/collections/shirts" className="hover:text-canvas transition-colors">
                Band-Collar Tunics
              </Link>
            </li>
            <li>
              <Link href="/collections/trousers" className="hover:text-canvas transition-colors">
                Double-Pleat Gurkhas
              </Link>
            </li>
            <li>
              <Link href="/collections/trousers" className="hover:text-canvas transition-colors">
                Tailored Chinos
              </Link>
            </li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h5 className="text-xs uppercase tracking-caps text-gold font-medium mb-4">
            Customer Care
          </h5>
          <ul className="space-y-2.5 text-sm text-canvas/70 font-sans">
            <li>
              <Link href="/policies/shipping" className="hover:text-canvas transition-colors">
                Shipping &amp; Courier Logistics
              </Link>
            </li>
            <li>
              <Link href="/policies/returns" className="hover:text-canvas transition-colors">
                Returns &amp; Atelier Alterations
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className="hover:text-canvas transition-colors">
                Privacy Policy &amp; Data Ethics
              </Link>
            </li>
            <li>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-canvas transition-colors inline-flex items-center space-x-1"
              >
                <span>WhatsApp Concierge</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Studio Admin */}
        <div>
          <h5 className="text-xs uppercase tracking-caps text-gold font-medium mb-4">
            Studio Operations
          </h5>
          <p className="text-canvas/60 text-xs leading-relaxed mb-4 font-sans">
            Authorized store staff and catalog operations portal.
          </p>
          <Link
            href="/admin/login"
            className="inline-block border border-gold/40 text-gold text-xs uppercase tracking-caps px-4 py-2 hover:bg-gold hover:text-navy transition-colors font-medium"
          >
            Staff Login &rarr;
          </Link>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-canvas/40 space-y-4 sm:space-y-0">
        <span>&copy; {new Date().getFullYear()} BHARAT Commerce. All rights reserved.</span>
        <span>Built with Precision &middot; Next.js &amp; Express</span>
      </div>
    </footer>
  );
}
