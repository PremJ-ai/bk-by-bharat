import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md space-y-4">
        <span className="text-xs uppercase tracking-caps text-gold font-medium block">
          404 &middot; Not Found
        </span>
        <h1 className="font-display text-4xl text-ink font-normal">
          Page Not In Atelier
        </h1>
        <p className="text-muted text-sm leading-relaxed font-sans">
          The requested page or collection does not exist or has been archived.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-block bg-navy text-canvas px-6 py-3 text-xs uppercase tracking-caps font-semibold hover:bg-gold hover:text-navy transition-colors"
          >
            Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
