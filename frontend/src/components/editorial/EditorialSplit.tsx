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

export function EditorialSplit() {
  return (
    <SectionReveal className="mx-auto max-w-[1440px] border-b border-border px-6 py-20 md:px-12">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <EditorialCropReveal>
            <div className="relative flex min-h-[420px] flex-col justify-between border border-border bg-[#eee8de] p-8 md:p-14">
              <div className="space-y-3">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-caps text-gold">The atelier</span>
                <h2 className="font-display text-3xl font-normal leading-tight text-ink md:text-5xl">
                  Considered pieces, clearly described.
                </h2>
              </div>
              <div className="mt-8 max-w-lg space-y-4">
                <p className="text-sm leading-relaxed text-muted md:text-base">
                  Discover the collection through its imagery, product details, material notes, and care guidance.
                  Each product page reflects the information saved for that garment.
                </p>
                <Link href="/collections/all" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-caps text-navy transition-colors hover:text-gold">
                  Explore the collection <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </EditorialCropReveal>
        </div>
        <StaggeredGrid className="space-y-4 lg:col-span-5">
          {garmentNotes.map((note) => (
            <div key={note.number} data-grid-item className="border border-border bg-surface p-6 md:p-8">
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
