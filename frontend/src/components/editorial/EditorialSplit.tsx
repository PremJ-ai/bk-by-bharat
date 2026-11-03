import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EditorialCropReveal } from "@/components/motion/EditorialCropReveal";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { StaggeredGrid } from "@/components/motion/StaggeredGrid";

const garmentNotes = [
  {
    number: "01",
    title: "Material",
    description: "Fabric and composition details are shown when they have been recorded for a garment.",
  },
  {
    number: "02",
    title: "Construction",
    description: "Explore the saved garment details alongside the product gallery and description.",
  },
  {
    number: "03",
    title: "Care",
    description: "Follow the care instructions provided for each individual piece.",
  },
];

interface EditorialSplitProps {
  imageUrl?: string;
  imageAlt?: string;
}

export function EditorialSplit({ imageUrl, imageAlt = "Bharat Atelier menswear editorial" }: EditorialSplitProps) {
  const hasImage = Boolean(imageUrl);

  return (
    <SectionReveal className="mx-auto max-w-[1440px] border-b border-border px-6 py-20 md:px-12">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EditorialCropReveal>
            <div className="group relative flex min-h-[420px] flex-col justify-between overflow-hidden border border-border bg-[#eee8de] p-8 md:p-14">
              {imageUrl && (
                <>
                  <img
                    src={imageUrl}
                    alt={imageAlt}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.035]"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#171b1b]/82 via-[#171b1b]/45 to-[#171b1b]/10" />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#171b1b]/35 to-transparent" />
                </>
              )}

              <div className="relative z-10 space-y-3">
                <span className={`mb-2 block text-[11px] font-medium uppercase tracking-caps ${hasImage ? "text-[#d9c4a0]" : "text-gold"}`}>
                  The atelier
                </span>
                <h2 className={`max-w-xl font-display text-3xl font-normal leading-tight md:text-5xl ${hasImage ? "text-white" : "text-ink"}`}>
                  Considered pieces, clearly described.
                </h2>
              </div>
              <div className="relative z-10 mt-8 max-w-lg space-y-4">
                <p className={`text-sm leading-relaxed md:text-base ${hasImage ? "text-white/82" : "text-muted"}`}>
                  Discover the collection through its imagery, product details, material notes, and care guidance.
                  Each product page reflects the information saved for that garment.
                </p>
                <Link
                  href="/collections/all"
                  className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-caps transition-colors ${hasImage ? "text-white hover:text-[#d9c4a0]" : "text-navy hover:text-gold"}`}
                >
                  Explore the collection <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </EditorialCropReveal>
        </div>
        <StaggeredGrid className="space-y-4 lg:col-span-5">
          {garmentNotes.map((note) => (
            <div key={note.number} data-grid-item className="border border-border bg-surface p-6 transition-colors duration-300 hover:border-[#c4aa7e] md:p-8">
              <span className="mb-2 block text-[10px] uppercase tracking-caps text-muted">{note.number} · Product notes</span>
              <h3 className="mb-2 font-display text-xl text-ink">{note.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{note.description}</p>
            </div>
          ))}
        </StaggeredGrid>
      </div>
    </SectionReveal>
  );
}
