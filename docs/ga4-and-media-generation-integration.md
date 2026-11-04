# GA4 and media-generation integration notes

This document describes the GA4 tracking and admin reporting integration points in Bharat Atelier, plus the current Hugging Face media-generation extension point.

## 1. Google Analytics 4: website event collection

The Google tag is mounted in the storefront route group only:

- `frontend/src/app/(store)/layout.tsx`
- `frontend/src/components/analytics/GoogleAnalytics.tsx`

The admin routes are outside the storefront route group, so administrator activity is not included in storefront GA4 page views.

Set this frontend variable in the Vercel frontend project for Preview and Production:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — the GA4 web-stream Measurement ID, usually shaped like `G-XXXXXXXXXX`.

Do not put a service-account private key or other Google Cloud credential in a `NEXT_PUBLIC_*` variable.

### Ecommerce event helper and current event placements

The shared event helper is:

- `frontend/src/lib/analytics/ga4.ts`

It maps store products into GA4 item objects and keeps event calls disabled when no Measurement ID is configured.

Current events wired:

| GA4 event | Trigger location |
|---|---|
| `page_view` | Storefront route pathname changes |
| `view_item_list` | Homepage New Arrivals list |
| `select_item` | Product selected from a product card |
| `view_item` | Product detail loaded |
| `add_to_cart` | Add item or increase quantity |
| `remove_from_cart` | Remove item or reduce quantity |
| `view_cart` | Shopping bag opened |
| `begin_checkout` | Guest checkout page opened with cart items |
| `purchase` | Only after order status reaches PAID / PROCESSING / SHIPPED / DELIVERED |

The purchase event is deliberately not sent when an order is merely created or payment proof is submitted. The current store uses manual payment verification; the verified order state is the conversion condition. GA4's recommended ecommerce events and item parameters are documented by Google:
https://developers.google.com/analytics/devguides/collection/ga4/ecommerce

No customer name, phone number, email, delivery address, payment screenshot URL, guest order token or admin identity is sent to GA4.

## 2. GA4: admin reporting

The authenticated admin dashboard reads the report panel from:

- Frontend: `frontend/src/components/admin/AnalyticsOverviewPanel.tsx`
- Dashboard location: `frontend/src/app/admin/page.tsx`
- Backend route: `GET /api/v1/admin/analytics/overview`
- Backend route file: `backend/src/modules/analytics/analytics.routes.ts`
- Reporting service: `backend/src/modules/analytics/google-analytics.service.ts`
- Route registration: `backend/src/routes/v1.ts`

The backend endpoint is protected by the existing administrator session middleware and ADMIN role authorization. Google credentials remain server-side.

### Why the Measurement ID alone is not enough

The Measurement ID lets the browser send events to GA4. To query GA4 reports from the admin dashboard, Google requires Data API access and an authenticated identity. This implementation uses a Google Cloud service account.

In Google Cloud:
1. Enable the Google Analytics Data API for the service account's Cloud project.
2. Create or use a service account and create a JSON key.
3. In GA4 Admin → Property Access Management, add the service-account email with Viewer access.
4. Copy the numeric GA4 Property ID from GA4 Property details.

Set these variables in the backend Vercel project for Preview and Production:

- `GOOGLE_ANALYTICS_PROPERTY_ID` — numeric property ID, not the G- Measurement ID.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — service-account email from Google Cloud.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — private key from the service-account JSON. Keep it secret; when entering it in Vercel, preserve line breaks or use escaped `\\n` sequences.

The endpoint requests a seven-day summary: active users, sessions, page views, add-to-carts, checkouts, purchases and purchase revenue. Results are cached in memory for five minutes per running API instance.

Google's official Data API quickstart explains service-account authentication and the `runReport` method:
https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart

If the backend report credentials are absent, the admin dashboard shows the required variable names and does not display sample figures as if they were real.

## 3. Hugging Face: where the AI integration lives

The existing media-generation extension points are:

- Provider interface and provider selection: `backend/src/modules/media/media.provider.ts`
- Generation orchestration and MediaAsset / ImageGenerationJob persistence: `backend/src/modules/media/media.service.ts`
- Authenticated generation endpoint: `backend/src/modules/media/media.routes.ts` at `POST /api/v1/admin/media/generate`
- Frontend request wrapper: `frontend/src/lib/api/media.ts` function `generateAiMedia()`
- Existing admin upload/preview manager: `frontend/src/components/admin/ProductMediaManager.tsx`

Current state:
- `HuggingFaceMediaGenerationProvider` is selected when `HF_TOKEN` is configured.
- The provider currently implements text-to-image through the `hf-inference` Inference Provider route.
- If no live Hugging Face token is configured, the admin Generate action fails with a setup message; curated Unsplash presets are not saved as AI output.
- Generated image bytes are written server-side to Supabase Storage before a `MediaAsset` record is created.
- The product editor appends the result as an image draft; saving/publishing the product remains a separate admin action.

The Hugging Face token must be a fine-grained token with the “Make calls to Inference Providers” permission and must be stored only in the backend Vercel project. Official documentation:
https://huggingface.co/docs/inference-providers/index

### Implemented text-to-image connection

The first Hugging Face text-to-image path is now implemented in the feature branch:

- Provider implementation and selection: `backend/src/modules/media/media.provider.ts` (`HuggingFaceMediaGenerationProvider`)
- Durable generated-image storage: `backend/src/modules/storage/supabase-public-media-storage.ts` (`storeGeneratedImage()`)
- Generation orchestration and job/media-asset persistence: `backend/src/modules/media/media.service.ts`
- Admin-only endpoint: `POST /api/v1/admin/media/generate` in `backend/src/modules/media/media.routes.ts`
- Browser request wrapper: `frontend/src/lib/api/media.ts` (`generateAiMedia()`)
- Admin UI: `frontend/src/components/admin/ProductMediaManager.tsx`
- Product creation and editing surfaces: `frontend/src/app/admin/products/new/page.tsx` and `frontend/src/app/admin/products/[id]/edit/page.tsx`

The button appears inside the Product Gallery section as “AI image studio · Hugging Face”. It uses the product name, fabric and category, accepts optional creative direction, calls the protected backend route, stores the generated image in Supabase and adds it to the current product draft. The admin must still save the product and review the image before publishing.

Current backend defaults:
- `HF_IMAGE_PROVIDER=hf-inference`
- `HF_IMAGE_MODEL=stabilityai/stable-diffusion-3-medium-diffusers`

These values can be overridden in the backend environment. The selected model must be available to the account's Inference Providers entitlement. The text-to-image adapter is implemented; video generation and reference-image-to-image editing are not part of this first increment.

The provider refuses to report success unless the returned image bytes are saved to the persistent Supabase media bucket. The live Hugging Face token is never returned to the browser.

Official Hugging Face task documentation:
- Text-to-image: https://huggingface.co/docs/inference-providers/tasks/text-to-image
- Inference Providers: https://huggingface.co/docs/inference-providers/index

The `HF_TOKEN` line in `backend/.env.example` is a placeholder for the secret value; the application reads `process.env.HF_TOKEN` in the backend provider.

## 4. Verification checklist

### GA4 tracking
- Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the frontend Vercel environment.
- Deploy a fresh frontend build.
- Open the storefront with GA4 Realtime or DebugView available.
- Verify `page_view`, `view_item_list`, `view_item`, `add_to_cart`, `view_cart` and `begin_checkout`.
- Confirm no GA tag is mounted on `/admin` or `/admin/login`.

### Admin reports
- Enable Google Analytics Data API.
- Grant the service account Viewer access to the correct GA4 property.
- Add the three backend report variables.
- Deploy a fresh backend build.
- Open Admin Overview → Google Analytics 4 and refresh.
- Compare displayed numbers with the GA4 property report for the same last-seven-days range.

### Hugging Face
- Do not assume the token alone activates generation.
- Implement and test the provider and durable Supabase storage step before enabling it in Production.
