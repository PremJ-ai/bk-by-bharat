# Bharat Atelier — Launch integrations and readiness

Updated: 2026-11-03

This document records the current integration state observed in the repository and the work still required before opening the store to customers. It is a plan, not a claim that any external service is already live.

## 1. Current architecture and what is already present

| Area | Current implementation | Launch status |
|---|---|---|
| Storefront | Next.js 15 / React 19 on Vercel | Present; needs responsive, visual and performance QA |
| API | Express / TypeScript on Vercel Functions | Present; needs production flow and load/latency verification |
| Database | PostgreSQL via Prisma; Supabase is the intended hosted database | Present; verify Production vs Preview separation, pooling and backups |
| Product media | Signed uploads to Supabase Storage through `SupabasePublicMediaStorage` | Integration scaffold present; configure bucket and verify end-to-end |
| Product galleries | IMAGE and VIDEO gallery, thumbnails and lightbox | Present; verify real uploaded media and mobile behavior |
| Admin identity | Argon2id and database-backed sessions | Present; preserve credentials and test login/session/logout |
| WhatsApp | `WhatsAppService`, local adapter, Meta provider and webhook routes | Partial; the Meta provider currently sends free-form text and does not serialize approved templates |
| Payment | UPI/QR, payment-proof upload and manual bank verification | Manual flow present; no online gateway adapter found |
| Shipping | Admin can save carrier and tracking details manually | Manual flow present; no carrier API adapter found |
| Analytics | No GA4 or PostHog SDK/configuration found in frontend package | Not integrated |
| Error monitoring | No Sentry setup found in inspected frontend/backend files | Not integrated |

### Important media findings

- The media upload service already requests signed upload URLs from Supabase Storage. The backend requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; `SUPABASE_PUBLIC_MEDIA_BUCKET` defaults to `product-media`.
- Keep the service-role key on the backend only. The browser should receive a short-lived signed upload URL, not the service-role key.
- The existing signed-upload flow is the preferred first production media path. Do not add Cloudinary as a second source of truth unless Supabase image/video transformation or delivery limits prove inadequate.
- The `LocalAtelierMediaProvider` is a deterministic curated-image URL selector, not live AI image generation. Do not market it as generative AI.
- The production code currently disables local/base64 file writes on Vercel. Use the signed Supabase upload path for production assets.
- The OpenAI image-generation provider needs a durable storage step before it is treated as a production media workflow; storing a temporary provider URL in the product record is not sufficient for long-term asset ownership.

## 2. Recommended launch stack

Keep the number of vendors low for the first release:

| Need | Recommended service | Why | Required setup |
|---|---|---|---|
| Hosting | Existing Vercel projects | Already hosts frontend and API | Confirm Production/Preview environments and function logs |
| Database | Existing Supabase PostgreSQL | Already used by Prisma | Production DB, pooled runtime connection, backup/restore test |
| Images and videos | Existing Supabase Storage | Signed upload flow is already implemented | Create/verify `product-media` public bucket, upload policies, cache headers and file limits |
| Online payments | Razorpay Standard Checkout + Orders API | India-first UPI/cards/netbanking path | Merchant onboarding/KYC, test and live keys, webhook secret |
| WhatsApp order updates | Meta WhatsApp Business Platform Cloud API | Direct integration avoids another BSP dependency | Business Portfolio, WABA, registered phone number, system-user token, app secret, verify token, approved templates |
| Business analytics | Google Analytics 4 (GA4) | Standard ecommerce reports and campaign attribution | GA4 property, web data stream, Measurement ID, consent/privacy notice |
| Product behavior (optional next phase) | PostHog | Funnels, feature analysis and session replay | Project key/host, masking and recording rules; do not record admin or checkout PII |
| Shipping automation (phase 2) | Shiprocket API | Order booking, courier selection, labels and tracking | Shiprocket account, pickup address, API credentials, webhook configuration |
| Error monitoring (recommended) | Sentry | Frontend/API exceptions and release health | Project DSNs, source-map upload and alert rules |

Do not subscribe to both PostHog and multiple overlapping analytics tools at the outset. Start with GA4 for acquisition and ecommerce reporting. Add PostHog only when funnel and replay analysis is needed.

## 3. Payment gateway — Razorpay

### Current state

The current order flow creates an order, issues an invoice/payment request, accepts UPI proof uploads, and requires an administrator to independently verify the bank transaction. No Razorpay SDK, order-creation API, signature verification module or payment webhook handler was found in the inspected repository.

### Required implementation

1. Create the Razorpay merchant account and complete its onboarding/KYC and website review.
2. Keep the existing server-calculated invoice total as the authority. Never accept an amount supplied by the browser as the amount to charge.
3. Add a backend payment-attempt record with a unique gateway order ID, amount in paise, currency, gateway payment ID, status, signature-verification flag and idempotency/webhook event ID.
4. Backend creates the Razorpay Order using the current invoice total, then returns only the public checkout key and gateway order reference to the browser.
5. Browser opens Razorpay Checkout. It must not mark the order paid.
6. Backend verifies the checkout signature using the secret, and independently handles signed webhook events. Only a verified/captured payment can transition the order to PAID.
7. Make webhook processing idempotent. Duplicate webhook deliveries must not decrement inventory or create duplicate invoices.
8. Store refunds against Razorpay refund IDs and reconcile their final status from the provider/webhook rather than treating a browser response as proof of refund.

### Environment variable names

Frontend Vercel project:
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`

Backend Vercel project:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Never expose `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET) to the browser, Git, logs or this document.

### Required tests

- Test-mode successful UPI payment, failed payment, cancelled checkout and duplicate webhook.
- Amount tampering attempt from browser.
- Invalid signature and webhook replay.
- Order is paid only after server verification.
- Inventory is decremented exactly once.
- Full and partial refund reconciliation.

## 4. WhatsApp — Meta Cloud API

### Current state

The repository already has:
- `WhatsAppService`
- `MetaCloudWhatsAppProvider`
- Local simulation adapter
- GET/POST webhook routes at `/api/v1/whatsapp/webhook`
- HMAC webhook verification hooks
- A checkout WhatsApp-consent field

However, the inspected Meta provider sends a `type: "text"` payload and does not use the supplied `templateName`. A business-initiated message outside the customer-service window needs an approved template. The local adapter can return a simulated SENT status; that must never be displayed as proof of a real message delivery.

### Required setup

1. Create/verify the Meta Business Portfolio and WhatsApp Business Account.
2. Register the business phone number and complete any required business verification.
3. Create a Meta developer app and subscribe it to the WhatsApp account.
4. Generate a system-user access token with the permissions required for WhatsApp business messaging/management.
5. Configure the webhook callback as:
   `https://bk-by-bharat-api.vercel.app/api/v1/whatsapp/webhook`
6. Configure the callback verify token and Meta app secret on the backend.
7. Subscribe to messages and message status webhook fields.
8. Submit and obtain approval for order confirmation, payment pending, payment confirmation, dispatch and delivery templates.
9. Ensure every recipient has explicitly opted in. Store the consent timestamp and the wording/version shown to the customer.
10. Use free-form replies only while the customer-service window is open; use approved templates for business-initiated updates outside that window.
11. Upgrade/configure the Graph API version instead of leaving the code permanently pinned to `v21.0`; verify a supported version in Meta's current dashboard/docs during implementation.

### Existing and additional backend environment variables

Already referenced in code:
- `META_WHATSAPP_TOKEN`
- `META_WHATSAPP_PHONE_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_VERIFY_TOKEN`

Add a configurable Graph API version rather than hardcoding it in the request path. Keep all Meta credentials server-side.

### Required implementation work

- Encode approved template components and variables in the provider request.
- Treat HTTP acceptance, SENT, DELIVERED, READ and FAILED as distinct states.
- Never convert a simulated/local message to a live-delivery claim.
- Make inbound webhook processing idempotent.
- Verify HMAC using the exact raw request body.
- Add retry/backoff and failed-message visibility in the admin panel.
- Do not send customer addresses, order tokens or payment-proof details in analytics or general logs.

## 5. Analytics — GA4 first, PostHog optional

### GA4 setup

Create a GA4 property and web data stream for the production storefront. Add the Measurement ID to the frontend environment as:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Implement recommended ecommerce events with the GA4 item schema:

- `view_item_list`
- `select_item`
- `view_item`
- `search`
- `add_to_cart`
- `view_cart`
- `begin_checkout`
- `add_shipping_info`
- `purchase`
- `refund`

Fire `purchase` only after backend-confirmed payment, and use a unique transaction/order ID to deduplicate. Send currency `INR`, confirmed value, and item identifiers/quantities. Do not send phone numbers, email addresses, street addresses, guest tokens, payment-proof URLs or other direct identifiers.

### Optional PostHog

Add PostHog only if product funnels, experiments or session replay are needed. Mask all text inputs and exclude checkout, payment-proof, login and admin pages from replay. Do not record passwords, customer contact details, addresses, tokens or payment details.

## 6. Shipping and post-purchase operations

The current admin API supports manual shipment creation with carrier, tracking number and tracking URL. This is enough for a controlled low-volume pilot if staff book shipments outside the application.

For automation, connect Shiprocket after Razorpay and WhatsApp are stable:
- Create shipments from paid/fulfillable orders.
- Fetch courier options and serviceability before confirming delivery promises.
- Generate labels/manifests.
- Receive tracking events through signed/verified webhooks.
- Map provider events to the existing shipment/order state machine.
- Make shipment webhooks idempotent.
- Keep manual correction and fallback tracking available.

## 7. Backend performance and reliability work

Do not optimize by guesswork. Capture a baseline first, then make one change at a time.

1. Measure p50/p95 latency for public catalog list/detail, checkout, admin orders, media upload URL creation and webhook handling.
2. Review Prisma query plans for public catalogue searches and admin order filters. The public product query loads product, category, variants and media; add or change indexes only after checking query plans and data volume.
3. Use Supabase's pooled connection URL for Vercel runtime traffic where appropriate; keep migration/administrative connections separate and never print database URLs.
4. Add bounded retries with jitter only for safe/idempotent upstream work. Do not blindly retry payment creation or stock mutations.
5. Keep webhook work short: verify, persist/deduplicate, acknowledge, and process heavier side effects safely.
6. Add request correlation IDs, structured error monitoring and alerts for failed payments, failed WhatsApp dispatch, DB saturation, upload failures and webhook errors.
7. Use caching/ISR for public catalogue data only after defining how product publish/update/unpublish events invalidate the cache. Do not cache account, order, checkout, inventory-reservation or payment state.
8. Keep hero/product images responsive and compressed. Use Supabase image transformations/CDN where enabled, lazy-load below-the-fold media, and prioritize only the hero/LCP image.
9. Keep reduced-motion support and test GSAP interactions on touch devices and lower-powered phones.

## 8. Production environment checklist

### Frontend Vercel project
- `API_BASE_URL` set for Production and Preview to the matching backend environment.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` after GA4 setup.
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` after Razorpay setup.
- `NEXT_PUBLIC_SENTRY_DSN` only if Sentry is enabled.

### Backend Vercel project
- `DATABASE_URL` points to the correct Production/Preview database and uses a connection strategy suitable for serverless functions.
- `SESSION_SECRET` is strong and unique per environment.
- `FRONTEND_ORIGIN` matches the exact storefront origin.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_PUBLIC_MEDIA_BUCKET` are configured.
- Razorpay and Meta secrets are set only when those integrations are enabled.
- `CRON_SECRET` is configured for the payment-hold expiry task.
- Preview and Production use separate databases and credentials.
- No production secrets are committed to Git or exposed in client-side environment variables.

### Business readiness
- Real business contact and support details.
- Accurate shipping costs, service regions and delivery estimates.
- Published Terms, Privacy, Shipping, Cancellation and Refund policies.
- GST/business details and invoice requirements confirmed with the business/accountant.
- Real bank/payee details and a tested refund process.
- Domain, HTTPS, customer support and incident-response ownership confirmed.
- Backup/restore and payment/webhook reconciliation tested.

## 9. Recommended sequence

**Phase A — Current UI branch**
- Full-viewport editorial hero using the current featured product media.
- Image-led editorial panel using a second catalogue image.
- Keep the current GSAP/reduced-motion architecture.
- Validate responsive behavior and Preview build before production merge.

**Phase B — Operational foundations**
- Verify Supabase Storage signed uploads and real media persistence.
- Add GA4 ecommerce events and privacy-safe consent/measurement.
- Complete Meta Cloud API templates, webhook validation and delivery status.

**Phase C — Online payments**
- Implement Razorpay order creation, signature validation, webhooks, idempotency, inventory settlement and refunds.
- Complete test-mode reconciliation before enabling live keys.

**Phase D — Shipping and growth**
- Add Shiprocket automation if manual fulfilment becomes a bottleneck.
- Add Sentry and optional PostHog.
- Tune caching, database queries and media delivery from measured production telemetry.

Do not launch live payments or automated WhatsApp notifications until their corresponding webhook, failure, retry, reconciliation and privacy tests pass.
