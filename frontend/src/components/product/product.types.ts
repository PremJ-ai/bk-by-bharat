export interface ProductViewModel {
  id: string;
  name: string;
  slug: string;
  category: string;
  material: string;
  pricePaise: number; // Stored in minor units (paise)
  currency: string;
  imageUrl?: string;
  imageAlt?: string;
  /** First uploaded product video, if present. The primary still image remains the default card face. */
  videoUrl?: string;
  videoPosterUrl?: string;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  badge?: "New" | "Limited" | "Atelier Pick" | "Core";
  isFixture?: boolean;
}
