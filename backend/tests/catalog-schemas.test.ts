import { describe, expect, it } from "vitest";
import { createProductSchema } from "../src/modules/catalog/catalog.schemas.js";

const image = (index: number) => ({
  url: `https://media.example.test/product-${index}.jpg`,
  altText: `Product image ${index}`,
  mimeType: "image/jpeg",
  fileSizeBytes: 1024,
});

const video = {
  url: "https://media.example.test/product-video.mp4",
  altText: "Product video",
  mediaType: "VIDEO",
  mimeType: "video/mp4",
  fileSizeBytes: 1024,
};

function productWithMedia(media: unknown[], fabricSpecifications?: unknown) {
  return createProductSchema.safeParse({
    name: "Atelier Jacket",
    description: "A carefully tailored jacket for everyday wear.",
    material: "Cotton twill",
    fabricSpecifications: fabricSpecifications ?? {
      fabricName: "Cotton twill",
      composition: "100% cotton",
      fibrePercentages: [{ fibre: "Cotton", percentage: 100 }],
      weightGsm: 240,
      weave: "twill",
      origin: "India",
      texture: "softly brushed",
      stretch: "no stretch",
      fit: "relaxed",
      pattern: "solid",
      colour: "navy",
      finish: "garment washed",
    },
    categoryName: "Tailoring",
    pricePaise: 120000,
    variants: [{ sku: "JKT-01-M", size: "M", colorName: "Navy" }],
    media,
  });
}

describe("product media and fabric specifications", () => {
  it("accepts four images, one video record, and fabric specifications", () => {
    const result = productWithMedia([
      ...Array.from({ length: 4 }, (_, index) => image(index + 1)),
      video,
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fabricSpecifications?.composition).toBe("100% cotton");
      expect(result.data.fabricSpecifications?.weightGsm).toBe(240);
      expect(result.data.media).toHaveLength(5);
    }
  });

  it("rejects more than four images or one video", () => {
    expect(productWithMedia(Array.from({ length: 5 }, (_, index) => image(index + 1))).success)
      .toBe(false);
    expect(productWithMedia([image(1), video, { ...video, url: "https://media.example.test/second.mp4" }]).success)
      .toBe(false);
  });

  it("rejects fibre percentages that do not total 100%", () => {
    expect(productWithMedia([image(1)], {
      fibrePercentages: [{ fibre: "Cotton", percentage: 80 }],
    }).success).toBe(false);
  });

  it("does not allow a video to be the primary product image", () => {
    expect(productWithMedia([{ ...video, isPrimary: true }]).success).toBe(false);
  });
});
