# Dependencies & Media Strategy — Fashion Commerce

This file defines the proposed dependencies for implementing `design.md` and `architecture.md`. Resolve current stable versions during project setup, commit the lockfile, and use one package manager throughout the repository.

## 1. Runtime, repository, and application split

- Use a currently supported Node.js LTS compatible with the chosen Next.js and Express versions. Verify the exact minimums during bootstrap.
- Use one package manager across the repo; `pnpm` workspaces are recommended. Commit one lockfile and keep application dependencies in each app's `package.json`.
- Enable strict TypeScript in both applications.
- `frontend/`: Next.js App Router + React + Tailwind, storefront pages, admin UI, and GSAP motion.
- `backend/`: Express.js + TypeScript REST API, authentication enforcement, controllers, services, repositories, PostgreSQL/Prisma access, and business logic.
- `contracts/openapi.yaml`: API contract shared between the frontend and backend.

Do not create all code in a single Next.js application and later attempt to peel the API out. The boundary between `frontend/` and `backend/` is intentional: Next.js must not contain the authoritative database or commerce business logic.

Suggested bootstrap sequence from the repository root:

```bash
mkdir fashion-commerce && cd fashion-commerce
pnpm init
pnpm create next-app frontend --ts --tailwind --app --src-dir
mkdir backend contracts
cd backend
pnpm init
pnpm add express zod helmet cors express-rate-limit pino
pnpm add -D typescript tsx @types/node @types/express
```

Review generated scripts and setup before installing other packages. Commands can vary by current framework CLI; adapt to its current documented options rather than forcing stale flags.

## 2. Frontend dependencies (`frontend/`)

| Package | Purpose | Scope |
|---|---|---|
| `next`, `react`, `react-dom` | Routing, rendering, metadata, image optimization, storefront and admin UI | Frontend runtime |
| `typescript` | Typed components and API contracts | Development |
| `tailwindcss` and version-compatible Next integration | Responsive styling and design tokens | Frontend/build |
| `gsap` | Timelines, ScrollTrigger, ScrollSmoother when available in the installed package | Browser/client-only entry points |
| `@gsap/react` | Lifecycle-aware GSAP integration and cleanup | Frontend runtime |
| `zod` | Client form validation and public environment validation; backend must validate independently | Frontend runtime |
| `lucide-react` | Consistent iconography | Frontend runtime |
| `clsx` + `tailwind-merge` | Conditional class composition | Frontend runtime |
| Font source through `next/font` | EB Garamond and Hanken Grotesk delivery | Next.js built-in |
| OpenAPI-generated types/client (optional) | Keep API requests and response DTOs aligned with backend contract | Frontend development/runtime as generated |

**GSAP setup:** register plugins from a client-only module. Use `@gsap/react` or a scoped GSAP context for cleanup. Verify whether `ScrollSmoother` is available in the selected package/build and licensing context. If unavailable, use native scrolling and keep `ScrollTrigger` effects independently guarded. Do not combine ScrollSmoother with another smooth-scroll engine.

## 3. Backend dependencies (`backend/`)

Pick one ORM/query strategy and one authentication/session approach; avoid installing competing stacks.

| Package / service | Purpose | Scope |
|---|---|---|
| `express` | HTTP routing and middleware | Backend runtime |
| `zod` | Validate params, query, body, environment, and provider callback payloads | Backend runtime |
| `helmet` | Security response headers | Backend runtime |
| `cors` | Explicitly allow configured development/deployment origins | Backend runtime |
| `express-rate-limit` or maintained equivalent | Abuse controls for admin login, guest checkout/order lookup, uploads, WhatsApp webhooks, and AI generation | Backend runtime |
| `pino` and request logging middleware | Structured, redacted logs and request IDs | Backend runtime |
| PostgreSQL | Canonical durable storage for admin users, catalog, variants, guest carts/orders, invoice versions, manual payment proofs, stock, WhatsApp events, media metadata, and audits | Database service |
| `prisma` + `@prisma/client` | Schema, migrations, typed queries, and transaction handling | Backend runtime/development |
| Maintained session/auth implementation | Password/session lifecycle, revocation, secure cookie support | Backend runtime; select deliberately |
| `argon2` or provider-supported adaptive hash | Password hashing if local password auth is chosen | Backend runtime; server only |
| `sharp` or trusted image-processing service | Resize, validate, and convert media | Backend runtime or media worker |
| WhatsApp Business Platform adapter (Meta Cloud API or approved BSP) | Transactional templates/media, QR/invoice messages, inbound webhooks and delivery status | Backend runtime only |
| Object storage SDK | Private upload flow and durable image/video storage | Backend runtime only |
| AI image-generation SDK | Product media generation | Backend runtime only |
| Optional email provider | Only if email receipts/support are added later; WhatsApp is the primary order channel | Backend runtime only |

The Express process is the only app allowed to connect to PostgreSQL. Next.js must call the Express API and must never import Prisma, database credentials, payment secrets, storage secrets, or AI SDKs.

### Optional dependencies — install only after need is verified

- `react-hook-form`: useful for a large admin product form; pair with Zod only if the team wants the integration.
- `@hookform/resolvers`: connects React Hook Form with Zod.
- `@tanstack/react-table`: helpful for sortable, paginated admin product tables.
- A maintained queue (for example BullMQ plus Redis) or managed jobs service: only if AI generation/transcoding is asynchronous and deployment needs durable job processing.
- Playwright: for end-to-end tests of the public catalog and admin publish flow.
- Vitest and Testing Library: for unit/component tests if the project does not already have a test stack.
- `axe-core` / axe Playwright integration: accessibility checks in automated browser tests.
- `@sentry/nextjs` or equivalent: error monitoring after deployment choice is known.

Do not add a payment-gateway SDK for the first release: payments are manually reconciled QR/UPI transfers. The backend must include WhatsApp integration only after its provider/account and credentials are selected. Do not add extra analytics/email/CMS packages until the feature is required.

## 4. AI product imagery: required design and integration

The required product authoring experience is **AI image first, then upload or change**. This must be designed as a media workflow, not as a one-time placeholder image inserted in the React component.

### Product media behavior

1. The seeded demo catalog uses custom AI-generated product imagery consistent with the garment and product details. Do not hotlink competitor photography or use the uploaded reference screenshots as product assets.
2. In Admin → Add Product, the administrator first saves a draft with product details.
3. The server passes normalized fields to the selected image provider using a standardized art-direction template.
4. The generated image appears as a preview with its provenance identified as AI-generated.
5. The admin may accept it, regenerate it, upload a new primary image, add extra angles, reorder the gallery, replace an image, or remove a media asset with confirmation.
6. A generated image never becomes public simply because a provider returned it; the admin must accept/publish according to the product state rules.
7. If generation fails or no provider is configured in local development, preserve the form and draft, show a retry/upload path, and use a local development placeholder only for preview—not as an undisclosed claim that an actual product photograph exists.

### Provider interface

Use one server-only adapter around the selected image generation provider:

```ts
export interface ProductImageGenerator {
  generate(input: {
    prompt: string;
    aspectRatio: "4:5" | "3:4" | "16:9";
    idempotencyKey: string;
  }): Promise<{
    providerJobId?: string;
    bytes?: Uint8Array;
    mimeType?: string;
  }>;
}
```

Keep provider-specific SDKs out of React components and client bundles. API keys must be server environment variables. If jobs are asynchronous, persist their status/ID and use a durable queue or provider webhook/polling strategy. Retry with idempotency and cost limits.

### Art-direction prompt template

Build a structured prompt from the saved product fields and a fixed editorial style. Treat user-entered free text as product data—not system instructions. Example template:

```text
Create a premium e-commerce product photograph of: {product_name}.
Garment type: {category}. Material/texture: {material}. Color: {color}.
Fit/silhouette: {fit}. Product details that must remain consistent: {verified_details}.
Composition: centered full product, vertical 4:5 crop, generous safe margins,
accurate garment anatomy, natural fabric folds, visible material texture,
clean tailored studio light, neutral warm-gray background, restrained luxury
menswear art direction, high detail, realistic proportions.
Do not add typography, watermark, logo, extra garments, accessories, labels,
props covering the product, or details not included in the product description.
Do not change the declared garment type or color.
```

For lifestyle/hero imagery, use a separate template and separate image slot so those assets are not confused with the primary product photograph. AI-generated images may contain defects or inaccurate details; admin review is required, and product claims must come from verified product data.

### Media record and storage requirements

For every image/video, retain:

- source: `ai_generated`, `uploaded`, or `external_migrated`;
- status: `pending`, `ready`, `failed`, or `rejected`;
- durable storage key and optimized delivery URL;
- MIME type, size, width, height, and optional duration;
- alt text, ordering, primary flag, creation timestamp;
- prompt/provider/job reference only as safe metadata where appropriate.

Store media in object storage/CDN or a durable platform media service. Prefer immutable object keys so replacing an image creates a new asset instead of mutating a shared URL. Validate format, file signature, size, dimensions, and ownership before making media available to the public. Generate responsive variants and thumbnails server-side or through the storage provider.

### Images and video on the storefront

- Use Next.js image optimization for configured trusted sources; prefer local `/public` assets or known storage/CDN hosts for product images.
- Define width/height or a fixed aspect-ratio container to prevent layout shift.
- Set meaningful `alt` text; decorative images have empty alt.
- Use a poster before loading video. Videos should be short, muted, `playsInline`, and paused when offscreen; visible playback controls are required for user-initiated video. Never autoplay audio.
- Lazy-load below-the-fold assets. Prioritize only the actual hero image and first visible product media.
- Keep `images.remotePatterns` restrictive if remote hosts are used. Do not allow arbitrary untrusted remote URLs.

## 5. Suggested installation and test sequence

Run commands from the matching app directory so packages remain correctly scoped.

Frontend example:

```bash
cd frontend
pnpm add gsap @gsap/react zod lucide-react clsx tailwind-merge
```

Backend baseline example:

```bash
cd backend
pnpm add express zod helmet cors express-rate-limit pino
pnpm add -D typescript tsx @types/node @types/express
pnpm add @prisma/client
pnpm add -D prisma
```

After selecting the admin auth/session implementation, WhatsApp provider, media storage, and AI image provider, add only the corresponding packages. Generate Prisma client and create reviewed migrations before implementing production writes. Add test tooling early: Vitest, Supertest, and Playwright are reasonable choices, with database-backed integration tests configured separately from development data.

Do not paste placeholder package names into package manifests or install all optional packages “just in case.” Check official provider docs and compatibility before locking versions.

## 6. Environment variable policy

Create separate `frontend/.env.example` and `backend/.env.example` files. Never commit real credentials.

Frontend example:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000/api/v1
```

`API_BASE_URL` should remain server-only unless there is a deliberate need for the browser to address a public API origin. Prefer same-origin `/api/v1` via a reverse proxy in production.

Backend example:

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fashion_commerce
SESSION_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:3000
TRUST_PROXY=false
# Configure only when providers are selected:
# REDIS_URL=
# OBJECT_STORAGE_BUCKET=
# OBJECT_STORAGE_ACCESS_KEY_ID=
# OBJECT_STORAGE_SECRET_ACCESS_KEY=
# WHATSAPP_PROVIDER=meta-cloud-api
# WHATSAPP_GRAPH_API_VERSION=  # select the current supported Graph API version
# WHATSAPP_PHONE_NUMBER_ID=
# WHATSAPP_BUSINESS_ACCOUNT_ID=
# WHATSAPP_ACCESS_TOKEN=
# WHATSAPP_APP_SECRET=
# WHATSAPP_VERIFY_TOKEN=
# ADMIN_WHATSAPP_RECIPIENTS=+91XXXXXXXXXX
# IMAGE_GENERATION_API_KEY=
# EMAIL_PROVIDER_API_KEY=  # optional; not needed for first release
# INTERNAL_REVALIDATION_SECRET=
```

Remove unused variables after provider selection. Validate environment values at each server startup. No secret may use the `NEXT_PUBLIC_` prefix, and backend-only secrets must never be copied to `frontend/.env` or shipped in a browser bundle. Use deployment secret management and rotate keys after exposure.

## 7. Avoided dependencies and anti-patterns

- Do not import server-only provider SDKs into client components.
- Do not run two scroll smoothing systems simultaneously.
- Do not embed a large base64 image into product records or source files; store durable media and reference it by ID/key.
- Do not use an image URL from a form as a trusted uploaded asset.
- Do not keep product records only in React state, a static JSON file, or hard-coded card components in production.
- Do not ship secret keys in browser bundles or commit `.env`.
- Do not introduce a heavyweight state library for product data that belongs on the server. Add client state only for interactions such as selected size, filters in progress, or cart UI.

## 8. Dependency acceptance checklist

- [ ] One package manager and committed lockfile.
- [ ] Strict TypeScript and environment validation.
- [ ] `gsap` + `@gsap/react` integrated with lifecycle cleanup; ScrollTrigger registered centrally.
- [ ] ScrollSmoother import is verified in the selected environment; native-scroll fallback works.
- [ ] Frontend and backend are separate apps with scoped dependencies and separate `.env.example` files.
- [ ] Express is the only app with database access; PostgreSQL/Prisma access is backend-only.
- [ ] Admin-only authentication/session implementation is selected and secrets are documented only in safe `.env.example` files. No customer registration flow exists.
- [ ] WhatsApp Business Platform/provider adapter is configured with approved utility/media templates, verified webhooks, opted-in recipients, deduplication, retries, and human escalation.
- [ ] Manual QR/UPI payment is modeled without a payment-gateway SDK; screenshot receipt is distinct from admin payment verification.
- [ ] AI provider is abstracted server-side; provider keys never reach the client.
- [ ] Payment QR is a private/admin-managed media setting and final invoices snapshot item subtotal, shipping and other applicable charges.
- [ ] Media upload and generated image both become validated media records with provenance.
- [ ] Image optimization, stable ratios, lazy loading, video poster and fallback behavior are implemented.
- [ ] Tests/lint/typecheck/build run in CI.


## 9. Official reference documentation

- [Next.js installation and system requirements](https://nextjs.org/docs/app/getting-started/installation)
- [GSAP installation](https://gsap.com/docs/v3/Installation/)
- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/)
- [GSAP ScrollSmoother](https://gsap.com/docs/v3/Plugins/ScrollSmoother/)
- [GSAP context and React cleanup concepts](https://gsap.com/docs/v3/GSAP/gsap.context/)

Recheck official documentation during bootstrap because framework and tool requirements can change.


## 10. WhatsApp integration references and constraints

- [WhatsApp Business Platform policy](https://whatsappbusiness.com/policy/) — business-initiated conversations, approved templates, customer-service window and automation/escalation obligations.
- [Meta WhatsApp Business Platform Messages API collection](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages) — text/media/template sending and message identifiers.
- [WhatsApp order details and summaries](https://faq.whatsapp.com/1249073475657215) — order-summary information responsibility; a WhatsApp summary does not replace any legally required invoice/receipt.

Recheck these official references and the selected provider's docs at integration time. Template approval rules, Graph API versions, and message pricing can change. A checkout form submission does not, by itself, open the WhatsApp 24-hour customer-service window; use approved templates for eligible business-initiated messages outside that window and preserve a human escalation path.
