"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Replace, Star, Trash2, Video, Sparkles, Loader2 } from "lucide-react";
import {
  createProductMediaUploadUrl,
  generateAiMedia,
  uploadMediaAsset,
  type AdminProductMediaItem,
  type ProductMediaMimeType,
} from "@/lib/api/media";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

async function validateVideoDuration(file: File): Promise<void> {
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        if (!Number.isFinite(video.duration) || video.duration < 3 || video.duration > 5) {
          reject(new Error("Product videos must be between 3 and 5 seconds."));
        } else {
          resolve();
        }
      };
      video.onerror = () => reject(new Error("The selected video could not be read."));
      video.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function uploadToStorage(
  url: string,
  file: File,
  mimeType: string,
  publicKey: string,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("apikey", publicKey);
    request.setRequestHeader("Authorization", `Bearer ${publicKey}`);
    request.setRequestHeader("Content-Type", mimeType);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Supabase could not store this product media. Please try again."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error("Supabase could not store this product media. Please try again."));
    };
    request.send(file);
  });
}

interface ProductMediaManagerProps {
  items: AdminProductMediaItem[];
  onChange: (items: AdminProductMediaItem[]) => void;
  productName: string;
  material: string;
  categoryName?: string;
  productId?: string;
}

export function ProductMediaManager({
  items,
  onChange,
  productName,
  material,
  categoryName = "Menswear",
  productId,
}: ProductMediaManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replacementIndexRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const generateAiImage = async () => {
    if (productName.trim().length < 2 || material.trim().length < 2) {
      setAiError("Enter the product name and fabric material before generating an image.");
      return;
    }
    if (items.filter((item) => item.mediaType === "IMAGE").length >= MAX_IMAGES) {
      setAiError("This product already has the maximum of four images. Remove or replace an image first.");
      return;
    }

    setAiGenerating(true);
    setAiError(null);
    try {
      const generated = await generateAiMedia({
        productName: productName.trim(),
        material: material.trim(),
        categoryName,
        productId,
        prompt: aiPrompt.trim() || undefined,
        width: 1024,
        height: 1280,
      });

      const newItem: AdminProductMediaItem = {
        mediaAssetId: generated.id,
        url: generated.url,
        altText: `${productName.trim()} in ${material.trim()}`,
        caption: "AI-generated image draft · review before publishing",
        posterUrl: null,
        mediaType: "IMAGE",
        mimeType: generated.mimeType as ProductMediaMimeType,
        fileSizeBytes: generated.fileSizeBytes,
        isPrimary: !items.some((item) => item.mediaType === "IMAGE" && item.isPrimary),
        sortOrder: items.length,
        source: "AI_GENERATED",
        storageKey: generated.storageKey,
      };

      onChange([...items, newItem]);
    } catch (generationError) {
      setAiError(
        generationError instanceof Error
          ? generationError.message
          : "Hugging Face image generation failed. Please try again."
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    const replacingIndex = replacementIndexRef.current;
    replacementIndexRef.current = null;
    let currentItems = [...items];
    try {
      for (const [fileIndex, file] of files.entries()) {
        const isImage = IMAGE_TYPES.includes(file.type);
        const isVideo = file.type === "video/mp4";
        if (!isImage && !isVideo) {
          throw new Error("Choose JPEG, PNG, WebP, AVIF, or MP4 media.");
        }
        const replacingItem = replacingIndex === null ? undefined : currentItems[replacingIndex];
        if (replacingIndex !== null && replacingItem?.mediaType !== (isVideo ? "VIDEO" : "IMAGE")) {
          throw new Error("Replace media with a file of the same type.");
        }
        const itemsForLimit = replacingItem
          ? currentItems.filter((_, index) => index !== replacingIndex)
          : currentItems;
        const imageCount = itemsForLimit.filter((item) => item.mediaType === "IMAGE").length;
        const videoCount = itemsForLimit.filter((item) => item.mediaType === "VIDEO").length;
        if (isImage && imageCount >= MAX_IMAGES) {
          throw new Error("A product can have up to four images.");
        }
        if (isVideo && videoCount >= 1) {
          throw new Error("A product can have one video.");
        }
        const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size < 1 || file.size > maxBytes) {
          throw new Error(
            isVideo
              ? "Product videos must be between 1 byte and 50MB."
              : "Product images must be between 1 byte and 10MB."
          );
        }
        if (isVideo) await validateVideoDuration(file);

        const mimeType = file.type as ProductMediaMimeType;
        const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!publicKey) {
          throw new Error("Product media storage is not configured. Contact the site administrator.");
        }
        const ticket = await createProductMediaUploadUrl({ mimeType, fileSizeBytes: file.size });
        await uploadToStorage(
          ticket.signedUploadUrl,
          file,
          mimeType,
          publicKey,
          (progress) => setUploadProgress(
            Math.round(((fileIndex + progress / 100) / files.length) * 100)
          )
        );
        const uploaded = await uploadMediaAsset({
          fileName: file.name,
          mimeType,
          storageKey: ticket.storageKey,
          fileSizeBytes: file.size,
          altText: `${productName || "Product"}${material ? ` in ${material}` : ""}`,
        });
        const newItem: AdminProductMediaItem = {
          id: uploaded.id,
          url: uploaded.url,
          altText: replacingItem?.altText || uploaded.altText,
          caption: replacingItem?.caption || "",
          posterUrl: isVideo ? replacingItem?.posterUrl || null : null,
          mediaType: isVideo ? "VIDEO" : "IMAGE",
          mimeType,
          fileSizeBytes: uploaded.fileSizeBytes,
          isPrimary: isImage && (replacingItem?.isPrimary ?? !currentItems.some((item) => item.isPrimary)),
          sortOrder: replacingIndex ?? currentItems.length,
          source: uploaded.source,
          storageKey: uploaded.storageKey,
        };
        const next = replacingIndex === null
          ? [...currentItems, newItem]
          : currentItems.map((item, index) => index === replacingIndex ? newItem : item);
        onChange(next);
        currentItems = next;
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Product media upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const updateItem = (index: number, patch: Partial<AdminProductMediaItem>) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const setPrimary = (index: number) => {
    if (items[index]?.mediaType === "VIDEO") return;
    onChange(items.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onChange(reordered.map((item, sortOrder) => ({ ...item, sortOrder })));
  };

  const removeItem = (index: number) => {
    const removed = items[index];
    const remaining = items
      .filter((_, itemIndex) => itemIndex !== index)
      .map((item, sortOrder) => ({ ...item, sortOrder }));
    if (removed?.isPrimary) {
      const firstImage = remaining.findIndex((item) => item.mediaType === "IMAGE");
      if (firstImage >= 0) remaining[firstImage] = { ...remaining[firstImage], isPrimary: true };
    }
    onChange(remaining);
  };

  const openFilePicker = (replaceIndex: number | null) => {
    replacementIndexRef.current = replaceIndex;
    if (inputRef.current) {
      inputRef.current.accept = replaceIndex === null
        ? [...IMAGE_TYPES, "video/mp4"].join(",")
        : items[replaceIndex]?.mediaType === "VIDEO" ? "video/mp4" : IMAGE_TYPES.join(",");
      inputRef.current.multiple = replaceIndex === null;
      inputRef.current.click();
    }
  };

  return (
    <section className="space-y-4 border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="font-display text-lg text-ink">Product Gallery</h2>
          <p className="mt-1 text-[11px] text-muted">
            Four images and one MP4 video (3–5 seconds). Image size limit: 10 MB; video: 50 MB.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openFilePicker(null)}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-2 border border-border px-3 py-2 text-xs font-medium text-ink hover:border-gold disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? `Uploading ${uploadProgress}%` : "Add media"}
        </button>
      </div>
      <div className="border border-[#e7d7f4] bg-[#fbf7ff] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-xs font-semibold text-[#533276]">
              <Sparkles className="h-4 w-4" />
              AI image studio · Hugging Face
            </h3>
            <p className="mt-1 text-[10px] leading-relaxed text-[#79668e]">
              Generate a product-image draft from the garment details. The image is saved to Supabase and added below for review.
            </p>
          </div>
          <span className="rounded-full border border-[#e7d7f4] bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#76538f]">
            Text to image
          </span>
        </div>
        <label className="block space-y-1 text-[10px] font-semibold uppercase tracking-wide text-[#79668e]">
          Optional creative direction
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            maxLength={3000}
            rows={3}
            placeholder="e.g. Full-body menswear editorial, model wearing this exact garment, warm sandstone studio, natural soft light. Keep the fabric, colour and cut accurate."
            className="w-full resize-y border border-[#e7d7f4] bg-white p-3 text-xs font-normal normal-case leading-relaxed text-slate-800 outline-none focus:border-[#a27ac1]"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[9px] text-[#79668e]">
            Uses product name, category and material as prompt context · 1024 × 1280
          </p>
          <button
            type="button"
            onClick={generateAiImage}
            disabled={aiGenerating || uploading || productName.trim().length < 2 || material.trim().length < 2 || items.filter((item) => item.mediaType === "IMAGE").length >= MAX_IMAGES}
            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#65418a] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:bg-[#50316e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiGenerating ? "Generating image…" : "Generate image"}
          </button>
        </div>
        {aiError && <p role="alert" className="text-xs text-rose-700">{aiError}</p>}
      </div>
      <input ref={inputRef} type="file" className="hidden" onChange={uploadFiles} />
      {uploading && (
        <progress aria-label="Media upload progress" value={uploadProgress} max="100" className="h-1 w-full accent-gold" />
      )}
      {error && <p role="alert" className="text-xs text-rust">{error}</p>}
      {items.length === 0 ? (
        <p className="border border-dashed border-border px-4 py-8 text-center text-xs text-muted">
          No product media added yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item, index) => (
            <article key={item.storageKey || item.url} className="border border-border bg-canvas">
              <div className="relative aspect-[4/3] bg-surface-muted">
                {item.mediaType === "VIDEO" ? (
                  <video src={item.url} poster={item.posterUrl || undefined} controls preload="metadata" className="h-full w-full object-contain" />
                ) : (
                  <img src={item.url} alt={item.altText} className="h-full w-full object-contain" />
                )}
                {item.isPrimary && (
                  <span className="absolute left-2 top-2 bg-navy px-2 py-1 text-[10px] uppercase tracking-wide text-white">
                    Primary image
                  </span>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted">
                    {item.mediaType === "VIDEO" ? <Video className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                    {item.mediaType}
                  </span>
                  <div className="flex gap-1">
                    {item.mediaType === "IMAGE" && (
                      <button type="button" aria-label="Set as primary image" title="Set as primary image" onClick={() => setPrimary(index)} className={`p-1.5 ${item.isPrimary ? "text-gold" : "text-muted hover:text-ink"}`}>
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" aria-label="Replace media" title="Replace media" disabled={uploading} onClick={() => openFilePicker(index)} className="p-1.5 text-muted hover:text-ink disabled:opacity-30">
                      <Replace className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move media up" disabled={index === 0} onClick={() => moveItem(index, -1)} className="p-1.5 text-muted disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move media down" disabled={index === items.length - 1} onClick={() => moveItem(index, 1)} className="p-1.5 text-muted disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Remove media" onClick={() => removeItem(index)} className="p-1.5 text-rust">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <label className="block space-y-1 text-[10px] uppercase tracking-wide text-muted">
                  Alt text
                  <input value={item.altText} onChange={(event) => updateItem(index, { altText: event.target.value })} maxLength={255} className="w-full border border-border bg-surface p-2 text-xs normal-case tracking-normal text-ink" />
                </label>
                <label className="block space-y-1 text-[10px] uppercase tracking-wide text-muted">
                  Caption
                  <input value={item.caption || ""} onChange={(event) => updateItem(index, { caption: event.target.value })} maxLength={255} className="w-full border border-border bg-surface p-2 text-xs normal-case tracking-normal text-ink" />
                </label>
                {item.mediaType === "VIDEO" && (
                  <label className="block space-y-1 text-[10px] uppercase tracking-wide text-muted">
                    Poster image URL (optional)
                    <input value={item.posterUrl || ""} onChange={(event) => updateItem(index, { posterUrl: event.target.value || null })} type="url" className="w-full border border-border bg-surface p-2 text-xs normal-case tracking-normal text-ink" />
                  </label>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
