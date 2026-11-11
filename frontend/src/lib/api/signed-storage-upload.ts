export interface SignedStorageUploadOptions {
  signedUploadUrl: string;
  file: Blob;
  mimeType: string;
  publicApiKey: string;
  fetcher?: typeof fetch;
}

/**
 * Supabase signed-object uploads require the original binary body, not multipart FormData.
 * Keeping this helper separate makes that wire contract straightforward to regression-test.
 */
export async function uploadFileToSignedStorage({
  signedUploadUrl,
  file,
  mimeType,
  publicApiKey,
  fetcher = fetch,
}: SignedStorageUploadOptions): Promise<void> {
  if (!signedUploadUrl || !/^https:\/\//i.test(signedUploadUrl)) {
    throw new Error("The secure upload URL is invalid.");
  }
  if (!publicApiKey.trim()) {
    throw new Error("Secure storage is not configured. Please contact the atelier.");
  }
  if (!mimeType.trim()) {
    throw new Error("The selected file type is missing.");
  }
  if (file.size < 1) {
    throw new Error("The selected file is empty.");
  }

  const response = await fetcher(signedUploadUrl, {
    method: "PUT",
    headers: {
      apikey: publicApiKey,
      Authorization: `Bearer ${publicApiKey}`,
      "Content-Type": mimeType,
      "x-upsert": "false",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("The screenshot could not be uploaded to secure storage. Please try again.");
  }
}
