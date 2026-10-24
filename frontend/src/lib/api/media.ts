import { apiClient } from "./client";

export interface MediaAssetDto {
  id: string;
  source: "AI_GENERATED" | "UPLOADED" | "EXTERNAL_MIGRATED";
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  storageKey: string;
  url: string;
  altText: string;
  mimeType: string;
  fileSizeBytes: number;
  prompt?: string;
  provenance?: string;
}

export async function generateAiMedia(data: {
  productName: string;
  material: string;
  categoryName: string;
  productId?: string;
}): Promise<MediaAssetDto> {
  const res = await apiClient<MediaAssetDto>("/admin/media/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function uploadMediaAsset(data: {
  fileName: string;
  mimeType: string;
  fileBase64?: string;
  url?: string;
  altText: string;
}): Promise<MediaAssetDto> {
  const res = await apiClient<MediaAssetDto>("/admin/media/upload", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function setPrimaryProductMedia(
  productId: string,
  mediaAssetId: string
): Promise<{ success: boolean; primaryMediaAssetId: string }> {
  const res = await apiClient<{ success: boolean; primaryMediaAssetId: string }>(
    `/admin/media/products/${productId}/media/primary`,
    {
      method: "PATCH",
      body: JSON.stringify({ mediaAssetId }),
    }
  );
  return res.data;
}

export async function reorderProductMedia(
  productId: string,
  mediaAssetIdsInOrder: string[]
): Promise<{ success: boolean }> {
  const res = await apiClient<{ success: boolean }>(
    `/admin/media/products/${productId}/media/reorder`,
    {
      method: "PATCH",
      body: JSON.stringify({ mediaAssetIdsInOrder }),
    }
  );
  return res.data;
}

export async function removeProductMedia(
  productId: string,
  mediaAssetId: string
): Promise<{ success: boolean }> {
  const res = await apiClient<{ success: boolean }>(
    `/admin/media/products/${productId}/media/${mediaAssetId}`,
    {
      method: "DELETE",
    }
  );
  return res.data;
}
