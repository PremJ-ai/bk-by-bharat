import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialCropReveal } from "@/components/motion/EditorialCropReveal";
import { SectionReveal } from "@/components/motion/SectionReveal";

export function EditorialSplit() {
  return (
    <SectionReveal className="max-w-[1440px] mx-auto px-6 md:px-12 py-20 border-b border-border">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Visual Editorial Frame */}
        <div className="lg:col-span-7">
          <EditorialCropReveal>
            <div className="bg-surface-muted border border-border p-8 md:p-14 relative min-h-[460px] flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-caps text-gold font-medium block">
                  The Philosophy
                </span>
                <h2 className="font-display text-3xl md:text-5xl text-ink font-normal leading-tight">
                  Honest Weight &amp; Architectural Silhouette
                </h2>
              </div>

              <div className="space-y-4 max-w-lg mt-8">
                <p className="text-muted text-sm md:text-base leading-relaxed">
                  Every pattern begins on drafting paper with calculated balance points. We design clothing to
                  sit cleanly against the collarbone, drape without friction over the hips, and preserve ease of movement.
                </p>
                <Link
                  href="/craft"
                  className="inline-flex items-center space-x-2 text-navy text-xs uppercase tracking-caps font-semibold hover:text-gold transition-colors"
                >
                  <span>Read the Craft Dossier</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </EditorialCropReveal>
        </div>

        {/* Right Craft Modules */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface p-8 border border-border">
            <span className="text-[10px] uppercase tracking-caps text-muted block mb-2">
              01 &middot; Provenance
            </span>
            <h3 className="font-display text-xl text-ink mb-2">Heritage Mills Only</h3>
            <p className="text-muted text-sm leading-relaxed">
              Sourced directly from certified flax weavers in Western Flanders and spinning mills in Piedmont.
            </p>
          </div>

          <div className="bg-surface p-8 border border-border">
            <span className="text-[10px] uppercase tracking-caps text-muted block mb-2">
              02 &middot; Precision
            </span>
            <h3 className="font-display text-xl text-ink mb-2">22 Stitches Per Inch</h3>
            <p className="text-muted text-sm leading-relaxed">
              Ultra-fine single needle lockstitching prevents puckering and withstands decades of laundering.
            </p>
          </div>

          <div className="bg-surface p-8 border border-border">
            <span className="text-[10px] uppercase tracking-caps text-muted block mb-2">
              03 &middot; Longevity
            </span>
            <h3 className="font-display text-xl text-ink mb-2">Lifetime Seam Warranty</h3>
            <p className="text-muted text-sm leading-relaxed">
              Should any Bharat garment develop seam strain under natural wear, our atelier repairs it at zero cost.
            </p>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}
