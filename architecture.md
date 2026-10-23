# Backend & Frontend Architecture — Fashion Commerce

**Status:** Implementation specification  
**Architecture decision:** A separately deployed Next.js frontend and Express.js backend. The frontend owns presentation and user interaction; the backend owns admin authentication, business rules, APIs, persistence, inventory, guest checkout, orders, manual QR/UPI payment verification, WhatsApp automation, media workflows, and integrations. Customer registration/login is explicitly out of scope for this store.

Read this document together with `design.md`, `dependencies.md`, and `agent.md`. If an existing repository already contains working code, inspect it and reconcile differences before making changes. Do not replace working code blindly.

---

## 1. Architecture goals and non-negotiable boundaries

1. **Separate folders and deployable applications:** `/frontend` contains the Next.js app; `/backend` contains the Express API and all authoritative business logic.
2. **One source of truth:** products, variants, prices, inventory, guest carts, guest orders, invoice snapshots, manual payment records/proofs, shipments, WhatsApp messages, media metadata, admin users, and admin actions are persisted through backend services and the database.
3. **Thin controllers:** controllers parse validated requests and shape HTTP responses. Business rules live in services/use cases, not route files, React components, or database model hooks.
4. **No database access from the frontend:** Next.js pages and components call the API. The frontend must never import Prisma, database drivers, payment SDK secrets, storage credentials, or AI-provider SDKs.
5. **Server-enforced security:** admin authentication/authorization, guest order access tokens, price calculation, stock checks, discounts, final invoice totals, order transitions, WhatsApp webhook verification, and publishing rules are enforced in Express and/or the database. Hiding a button is not authorization.
6. **Shared API contract:** document API shapes in OpenAPI and generate or maintain typed frontend API clients from the contract. Validate requests again in the backend.
7. **AI-first product media:** draft product details are saved first, an AI image job can be requested, and an administrator reviews the result before it becomes public. Upload/replace/add/reorder/set-primary options remain available.
8. **Guest checkout and WhatsApp-assisted fulfillment:** customers do not register. They submit a cart and delivery details, the admin confirms the final bill, a configured payment QR is sent over WhatsApp, the admin verifies payment manually, and shipping/cancellation/refund communication runs through WhatsApp automation. No card/payment-gateway checkout is included in the first release.

## 2. System overview

```text
Browser / Mobile Browser
        |
        | HTTPS: storefront, cart, guest checkout, admin UI
        v
/frontend — Next.js App Router (TypeScript)
  - Editorial storefront, product cards and product pages
  - Cart + guest checkout form; no customer account screens
  - Admin order/product operations UI
  - GSAP / ScrollTrigger / ScrollSmoother on eligible storefront routes
  - Typed API client; no direct database access
        |
        | HTTPS JSON requests to /api/v1
        | Admin session cookie; guest order access token for scoped order actions
        v
/backend — Express.js API (TypeScript)
  Request ID / security headers / CORS / rate limits
        |
  Router -> session auth (admin-only) -> authorization -> validation
        |
  Controller -> Application Service / Use Case
        |
  Domain rules <-> Repository interfaces
        |
  Prisma ORM / transactions
        v
PostgreSQL — canonical application data
        |
        +---- Private object storage: product media and payment-proof screenshots
        +---- WhatsApp Business Platform/provider: messages, images, QR/invoice, inbound webhooks
        +---- AI image provider: server-side product-image generation
        +---- Optional shipping label/tracking provider (manual entry supported first)
        +---- Optional Redis + durable queue: retries, jobs, rate limits, outbox
```

### Responsibility split

| Concern | Frontend (`/frontend`) | Backend (`/backend`) |
|---|---|---|
| Visual layout, styling, animations | Owns | No UI responsibility |
| Product cards and product pages | Renders API view models | Supplies published product data |
| Admin panel | Forms, tables, previews, loading/error states | Admin APIs and all privileged operations |
| Authentication | Admin sign-in UI only; no customer registration/login | Admin sessions, password verification, role checks, login limits |
| Authorization | Optional display logic only | Enforces roles, permissions, and resource ownership |
| Prices, discounts, totals | Displays server result; never authoritative | Calculates and validates every amount |
| Inventory | Displays availability | Reserves, releases, decrements, and reconciles stock |
| Cart and checkout | Guest cart and delivery/contact form | Validates cart, reprices, reserves stock, creates guest order and order-access token |
| Orders and payment | Displays order/payment status; guest checkout | Final invoice, manual QR payment records, screenshot intake, admin verification, state transitions |
| Database | No database connection | Owns schema, migrations, transactions, repositories |
| WhatsApp | Opens chat when needed; shows status and support actions | Sends templates/media, receives webhook events, routes cancellation/refund requests, tracks delivery |
| AI/media | Displays preview and offers actions | Calls provider, validates uploads, stores assets, controls publishing |

---

## 3. Repository layout

Use a single repository with two distinct applications. Use one package manager and lockfile strategy; pnpm workspaces are recommended. Each app has its own `package.json`, environment schema, scripts, tests, and deploy configuration.

```text
fashion-commerce/
├── frontend/                           # Next.js storefront + admin UI
│   ├── src/
│   │   ├── app/
│   │   │   ├── (store)/
│   │   │   │   ├── page.tsx             # Home
│   │   │   │   ├── collections/[slug]/page.tsx
│   │   │   │   ├── products/[slug]/page.tsx
│   │   │   │   ├── search/page.tsx
│   │   │   │   ├── cart/page.tsx
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   ├── orders/confirmation/[token]/page.tsx
│   │   │   │   └── order-status/[token]/page.tsx
│   │   │   ├── admin/
│   │   │   │   ├── login/page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx             # Admin overview
│   │   │   │   ├── products/page.tsx
│   │   │   │   ├── products/new/page.tsx
│   │   │   │   ├── products/[id]/edit/page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── orders/[id]/page.tsx
│   │   │   │   ├── inventory/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   ├── settings/payment/page.tsx
│   │   │   │   └── whatsapp/page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── not-found.tsx
│   │   ├── components/
│   │   │   ├── ui/                      # Button, field, dialog, toast, table
│   │   │   ├── layout/                  # Header, footer, nav, page container
│   │   │   ├── editorial/               # Hero, campaign, video, brand sections
│   │   │   ├── product/                 # ProductCard, grid, gallery, filters
│   │   │   ├── cart/                    # Cart lines, totals, quantity controls
│   │   │   ├── checkout/                # Guest details, order summary and WhatsApp handoff
│   │   │   ├── order-status/            # Scoped guest order status and cancellation request
│   │   │   ├── admin/                   # Admin navigation, tables, editors
│   │   │   └── motion/                  # GSAP provider/hooks and effects
│   │   ├── features/
│   │   │   ├── catalog/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   └── admin/
│   │   ├── lib/
│   │   │   ├── api/                     # Typed HTTP client and API errors
│   │   │   ├── auth/                    # Session display helpers, not auth authority
│   │   │   ├── format/                  # Currency, dates, availability
│   │   │   ├── env.ts                   # Public frontend env validation
│   │   │   └── utils.ts
│   │   └── tests/
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   └── .env.example
│
├── backend/                            # Express API and business logic
│   ├── src/
│   │   ├── app.ts                       # Express app and middleware registration
│   │   ├── server.ts                    # Listen, shutdown, health setup
│   │   ├── config/
│   │   │   ├── env.ts                   # Parse and validate environment
│   │   │   └── constants.ts
│   │   ├── routes/v1.ts                 # API version router
│   │   ├── middleware/
│   │   │   ├── request-id.ts
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── validate.ts
│   │   │   ├── csrf.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── not-found.ts
│   │   │   └── error-handler.ts
│   │   ├── modules/
│   │   │   ├── admin-auth/              # Admin/staff identity and sessions only
│   │   │   ├── catalog/                 # Products, categories, collections
│   │   │   ├── inventory/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── orders/
│   │   │   ├── manual-payments/         # QR config, proof intake, reconciliation
│   │   │   ├── promotions/
│   │   │   ├── shipping/                # Shipment/tracking fields
│   │   │   ├── whatsapp/                # Messages, inbound webhooks, automated intents
│   │   │   ├── media/
│   │   │   ├── reviews/                 # Optional for first release
│   │   │   ├── analytics/               # Admin metrics from stored events
│   │   │   └── audit/
│   │   ├── providers/
│   │   │   ├── whatsapp/                # Meta Cloud API or approved BSP adapter
│   │   │   ├── image-generation/
│   │   │   ├── storage/
│   │   │   ├── email/                   # Optional only; WhatsApp is primary order channel
│   │   │   └── shipping/
│   │   ├── jobs/                        # Expire reservations, process media
│   │   ├── db/
│   │   │   ├── prisma.ts
│   │   │   └── seed.ts
│   │   ├── lib/                         # Logger, errors, money, idempotency
│   │   └── types/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── package.json
│   └── .env.example
│
├── contracts/
│   └── openapi.yaml                    # Canonical public/admin API contract
├── infra/                              # Optional Docker/reverse-proxy/CI config
├── design.md                            # Canonical source-of-truth documents
├── architecture.md
├── dependencies.md
├── agent.md
├── pnpm-workspace.yaml
├── package.json                         # Root scripts only
└── README.md
```

Keep these four documentation files at the repository root as the canonical copies. Do not create divergent duplicate versions in another docs folder unless the team chooses and documents a single source-of-truth workflow.

### Module pattern

Use this pattern inside backend feature modules where it adds clarity:

```text
modules/catalog/
├── product.routes.ts        # HTTP paths + middleware order
├── product.controller.ts    # Request/response translation only
├── product.schemas.ts       # Zod request/response input schemas
├── product.service.ts       # Product use cases and business rules
├── product.repository.ts    # Database queries/persistence
├── product.mapper.ts        # DB/domain -> API DTO mapping
└── product.types.ts         # Domain types where needed
```

Do not create files just to match this diagram. Small modules may combine route and controller files, but must keep HTTP concerns separate from business logic and database access.

---

## 4. Request lifecycle and service/controller responsibilities

Expected Express middleware sequence:

1. Request ID / correlation ID and access logging.
2. Security headers (`helmet`) and body size limits.
3. CORS allowlist and credentials handling where required; never wildcard credentials.
4. Rate limiting for sensitive/publicly abusable endpoints.
5. JSON parsing and cookie parsing.
6. Route matching under `/api/v1`.
7. Authentication middleware for protected endpoints.
8. Authorization middleware for role, permission, and resource scope.
9. Zod validation of params, query, body, and relevant headers.
10. Controller calls the relevant application service.
11. Service applies domain rules and uses repository/provider interfaces.
12. Controller returns a stable API response; centralized error middleware maps known errors to HTTP status codes.

### Layer duties

- **Route:** declares endpoint, middleware order, and controller method. No business logic or SQL/ORM calls.
- **Middleware:** cross-cutting request concerns such as session loading, permission checks, validation, CSRF, rate limits, and request IDs.
- **Controller:** reads already validated inputs, invokes one use case, maps the result to a DTO and appropriate HTTP status.
- **Service/use case:** authoritative business logic, transaction boundaries, permission-sensitive operations, orchestration with providers, idempotency and state transitions.
- **Repository:** encapsulates database reads/writes; never sends HTTP responses.
- **Provider adapter:** wraps WhatsApp Business messaging, object storage, AI image generation, and optional shipping services behind stable interfaces. The first release has no online payment-gateway adapter.
- **Job/worker:** handles retryable or long-running work outside the request lifecycle.

Example: `POST /api/v1/admin/products` -> `authenticate` -> `authorize('product:create')` -> validate create schema -> `ProductController.create` -> `ProductService.createDraft` -> repository transaction -> audit event -> response DTO. The frontend does not write to the database or invent a second copy of the product.

---

## 5. Authentication, sessions, roles, and authorization

### Customer identity decision: guest checkout only

- **Do not implement customer registration, customer login, password reset, customer profiles, or address books in the first release.** Do not add `/register`, `/login`, `/me`, `/me/addresses`, or account merge APIs for customers.
- Customers enter their name, WhatsApp number, and shipping details at checkout. These details become a snapshot on the order, not a reusable customer account.
- A customer can view order status or request cancellation from a private, high-entropy order-access token. Store only a hash of the token, scope it to that order and allowed actions, expire/revoke it as configured, rate-limit lookups, and never expose an order using only a guessable order number or phone number. Confirmation/status routes must be `noindex`, exclude third-party analytics/embeds, use a strict `Referrer-Policy` (prefer `no-referrer`), and never log the raw token.
- An inbound WhatsApp phone number can help correlate a conversation to an order, but phone match alone must not reveal multiple orders or permit sensitive changes. Ask for an order number/reference or use a verified order-specific link when ambiguous.

### Admin authentication

Use a maintained authentication/session implementation or a carefully reviewed session library for admin/staff users. Prefer opaque, revocable, server-side sessions rather than inventing token cryptography. Store session state in PostgreSQL or Redis; store only a random session identifier in the cookie.

- Cookie name: `__Host-store_session` where deployment constraints support the `__Host-` rules.
- Cookie flags: `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, no `Domain` attribute when using `__Host-`.
- Prefer same-origin reverse proxy routing so the browser calls `/api/v1` and Express remains behind the proxy.
- Mutating cookie-authenticated requests must validate `Origin`/`Referer` where appropriate and use CSRF protection. `SameSite` is defense-in-depth.
- Rotate session ID after login and privilege changes. Logout and administrator disablement must revoke active sessions.
- Passwords must use strong adaptive hashes from a maintained library; never store plaintext or reversibly encrypted passwords.
- Rate-limit login, session creation, password reset if enabled for staff, and sensitive admin operations. Admin MFA is strongly recommended before production.
- Create the first admin through a controlled one-time CLI command or deployment task. Refuse bootstrap if an active admin already exists. **Never expose public admin self-registration.**

If frontend and API are deployed on different sites, explicitly redesign cookie, CSRF, CORS, and redirect behavior before shipping; do not copy same-origin assumptions unchanged.

### Roles

Initial role: `admin`. Add `support` or `catalog_manager` only when there is a real need and permissions are defined. Customers are not application users in this release; their contact information belongs to a guest order. Every admin endpoint checks authorization on the backend.

### Authentication endpoints

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/v1/admin-auth/login` | Verify admin credentials and establish session | Public, rate-limited |
| `POST` | `/api/v1/admin-auth/logout` | Revoke current admin session | Admin |
| `GET` | `/api/v1/admin-auth/session` | Return safe admin identity/permissions DTO | Admin |
| `POST` | `/api/v1/admin-auth/bootstrap` | **Not a public endpoint**; bootstrap via one-time CLI/task only | Deployment task |

Never return password hashes, session IDs, reset tokens, provider secrets, or internal security metadata in API DTOs. There must be no customer registration endpoint.

## 6. Core domain modules and business logic

### 6.1 Catalog / products

Responsibilities: products, categories, collections, slugs, product variants, descriptive content, publication status, ordering, filtering, sorting, and SEO-safe fields.

Rules:

- Product states are `draft`, `published`, and `archived`.
- Only `published` products are returned by public catalog queries. Draft and archived records must not leak through search, related products, sitemap, collection counts, or product-by-slug endpoints.
- `id` is stable identity; `slug` is a unique public route identifier and can change with redirect/history handling if needed.
- Product-level fields include name, slug, description, material, category, tags, and status. Sellable size/color options are variants with SKU and inventory.
- Validate name, slug, category, required product fields, and unique SKU/slug on the backend. Normalize slugs and reject invalid values.
- Publishing requires a valid name/slug, at least one valid sellable variant when the product uses variants, a nonnegative price, and one accepted primary image. Additional requirements may be category-specific.
- Archive instead of hard-delete products referenced by completed orders. Hard-delete only unused drafts or use a protected retention workflow.
- Product card data comes from a backend view-model mapper. React components must not independently calculate stock, price ranges, or publication visibility.

### 6.2 Price and currency

- Store amounts as integer minor units (for INR, paise) and store an explicit currency code on relevant records.
- Never use floating-point arithmetic for money.
- The API is authoritative for item price, sale price, discount, tax, shipping fee, and order total.
- The client sends product/variant IDs, quantity, shipping selection, and promotion code—not a trusted price or final total.
- At checkout, re-read current product price and promotion rules from the database and recalculate totals.
- If the price has changed since the cart was created, return the updated total and require the customer to review/confirm before payment.

### 6.3 Inventory and availability

- Inventory belongs to a sellable variant/SKU (size/color), not just the product card.
- Track on-hand quantity and active reservations or derive available stock from a reliable inventory ledger/reservation model.
- `available = onHand - activeReserved` for a reservation-based model; never allow available stock to go negative.
- Availability labels (`in_stock`, `low_stock`, `out_of_stock`, `preorder`) are derived by backend rules. An admin override, if supported, must be explicit and audited; it cannot bypass fulfillment safeguards.
- Stock adjustments require a reason and create an audit/inventory movement record.
- Reserve stock atomically in a database transaction with row locking/conditional updates or another proven concurrency-safe method. In the manual admin-payment flow, create the stock reservation when the admin confirms availability/final invoice and requests payment, not when an order is merely waiting for admin review. Do not rely on a prior read alone; it can oversell during simultaneous checkouts.
- Release expired/failed reservations with a scheduled job. Only when the admin marks a real payment verified should the service convert reserved units to sold/decrement on-hand, exactly once through an idempotent transition.

### 6.4 Cart

- A guest cart contains variant ID, quantity, and an opaque cart token/expiry. The backend re-derives product name, image, price, stock, and discount at read/checkout time.
- Quantity must be an integer greater than zero and within configured limits.
- Reject disabled, archived, unpublished, or unavailable variants.
- Validate every quantity change against current availability; still re-check during checkout because stock can change later.
- Persist guest carts server-side or keep a signed/opaque token whose contents are not treated as price authority. Never trust client cart totals.
- No cart merge exists because customers do not sign in. Revalidate current stock and pricing before order creation.

### 6.5 Promotions and discounts

Promotion rules can support fixed amount, percentage, eligibility, minimum spend, date window, usage limit, user limit, and applicable product/category scope.

- Validate the code and applicability on the backend at both cart/checkout and final order creation.
- Enforce maximum discount, prevent negative line/item/order totals, and define whether discounts apply before tax/shipping.
- Enforce usage limits transactionally to prevent concurrent over-redemption.
- Record the exact promotion/discount applied on the order so later changes to a promotion do not rewrite order history.

### 6.6 Guest checkout and order creation

The first release does not use online gateway/card checkout. The customer places a guest order on the site; the administrator confirms the complete bill and sends the configured UPI/bank QR plus invoice over WhatsApp. The customer pays externally and sends a screenshot; the admin independently verifies the transaction before dispatch.

Required guest checkout fields:

- Recipient full name.
- WhatsApp phone number in normalized international/E.164 format.
- Delivery address: address line(s), city, state/region, postal code, country, and optional delivery note.
- Cart variants and quantities; the browser sends IDs and quantities, never trusted prices/totals.
- Explicit consent to receive order-related WhatsApp communication. Store consent timestamp, source, wording/version, and phone number. Do not treat typing a number as consent.
- Email is optional only if the business later decides to support it; it is not a requirement for account creation.

Flow:

1. Backend loads current published product/variant data and revalidates stock, quantity limits, price, discount, and address fields.
2. Backend creates an order with immutable product/variant/price/image snapshots, contact/address snapshot, order number, idempotency key, and initial status `awaiting_admin_review`. The order is attached to a random guest access token; store only its hash.
3. On guest order creation, verify current availability but do not lock stock indefinitely while the admin is still reviewing. When the admin approves availability and creates the final invoice/payment request, reserve stock atomically for a configurable payment-hold TTL. If stock is no longer available, do not request payment; tell the customer and cancel/revise the order. Expire/release payment holds for unpaid/expired orders. Never decrement stock twice.
4. Notify the admin through a private one-to-one WhatsApp message to an allowlisted admin recipient. Include the order number, customer full name, WhatsApp number, complete delivery address and delivery notes, item names/images, selected sizes/colors, quantities, current item subtotal, and a protected admin deep link. Do not send customer PII to a group chat or unapproved recipient. Confirm internal recipients have agreed to receive these notifications. Keep the full order visible in the admin dashboard if WhatsApp is unavailable.
5. Admin re-checks stock and atomically reserves the requested variants for a configured payment window. If items are no longer available, do not request payment. Admin confirms shipping and any applicable tax, packaging, discount, or other fees. Admin creates a versioned invoice snapshot containing item subtotal, discounts, tax where applicable, shipping, other disclosed fees, and final payable total in INR. Do not send the QR before the payable total is clear.
6. Backend records the bill version and a payment request. Admin triggers `Send payment request`; the WhatsApp service sends the invoice summary and configured QR to the customer. If this is a business-initiated message outside the 24-hour customer-service window, use an approved WhatsApp template/approved media template and valid customer opt-in. Do not pretend a normal free-form message will always be deliverable.
7. Customer pays externally using the QR and sends a screenshot/receipt to the business WhatsApp. The inbound WhatsApp webhook stores the media in private storage, records sender/message IDs, and associates it to the order only when match is reliable. If multiple orders match, ask for the order number/reference.
8. Screenshot receipt changes status only to `payment_proof_received` / `payment_under_review`. Admin checks the actual bank/UPI ledger or provider account and compares the amount/reference. Only an authenticated admin action can mark `paid`, recording verifier, timestamp, amount, method, and UTR/transaction reference where available. A screenshot alone is never authoritative proof of payment.
9. Once payment is verified, the order can move to processing/ready-to-ship. Admin records courier, tracking number, tracking URL, dispatch timestamp, and any final invoice adjustment approved by customer. The shipping update and final bill are sent through WhatsApp.
10. Use an outbox/job queue for WhatsApp sending and retry with idempotency; message delivery failure must not lose an order or block admin access to it.

**Billing rule:** known shipping and other charges must be included in the final invoice before the customer pays. If an extra charge is discovered later, the admin must issue a revised itemized invoice, explain the reason, and obtain customer approval before charging/requesting it. Never silently alter the final total or ship with undocumented charges.

### 6.7 Order, manual-payment, and fulfillment states

Keep fulfillment status separate from manual-payment status. Define allowed transitions in one domain service and reject impossible changes.

Suggested order statuses:

- `awaiting_admin_review`
- `awaiting_customer_payment`
- `payment_proof_received`
- `payment_under_review`
- `paid`
- `processing`
- `shipped`
- `delivered`
- `cancellation_requested`
- `cancelled`
- `refund_requested`
- `refund_processing`
- `partially_refunded`
- `refunded`
- `payment_expired` / `rejected` where appropriate

Suggested manual payment record statuses: `not_requested`, `requested`, `proof_received`, `under_review`, `verified`, `rejected`, `expired`, `refund_pending`, `refunded`.

Rules:

- `awaiting_customer_payment` can be entered only after admin has set a complete bill/invoice and initiated a payment request.
- A received screenshot never changes the order to `paid`.
- Only an authenticated admin who has independently checked the bank/UPI transaction can mark it verified/paid. Record amount, currency, transaction reference, verifier and timestamp; flag duplicates or amount mismatches.
- Do not ship until payment is verified and final bill requirements are satisfied.
- Inventory reservation/commit/release operations must be transactional and idempotent.
- Payment requests and invoices have versions. A revised invoice invalidates an unpaid prior payment request; the latest bill total must be explicit to the customer.
- Admin overrides to order states require a reason and audit event.

### 6.8 WhatsApp-based notifications, cancellation, and refund requests

Implement a `WhatsAppService`/provider interface and webhook handler. Inbound message processing must verify provider signatures/tokens, deduplicate provider message IDs, normalize phone numbers, persist an event before side effects, and use an idempotent workflow. Do not put WhatsApp access tokens in the frontend.

Supported intents in the first release:

- `TRACK_ORDER`: respond with status and tracking details only after safely matching the order.
- `CANCEL_ORDER`: create a cancellation request and notify the admin; auto-cancel only when order policy says it is unpaid, unshipped, and safe to cancel. Paid, being-processed, or shipped orders go to admin review.
- `REFUND_REQUEST`: create a refund request and route it to the admin. No automatic refund approval or transfer.
- `PAYMENT_PROOF`: accept an image/document from the customer, privately store it, associate safely to the order, and put it in the admin review queue.
- `HUMAN_SUPPORT`: give a clear path to a human/admin. Automation must never trap a customer in a bot-only path.

The guest order-status page uses a random scoped access token and can offer a `Request cancellation` action when allowed. This website action calls the same `CancellationService` as the WhatsApp webhook; the service updates the order and triggers WhatsApp confirmation/notification. The customer does not need to log in. Do not cancel an order merely because a free-text message classifier guessed the intent; confirm the order/reference and cancellation action first.

Refunds are requested and communicated over WhatsApp. The admin performs the actual refund manually through the original UPI/bank method or agreed method, verifies it, enters amount/reference/reason in the admin panel, and confirms over WhatsApp. The website records an audit trail but is not a payment gateway in this release.

WhatsApp provider constraints:

- A website checkout submission does not itself open a WhatsApp customer-service window.
- Collect clear opt-in for transactional WhatsApp messages.
- When sending the first business-initiated message or messaging outside the current service window, use a Meta-approved template for the relevant purpose; for product/payment media, select a template format supported by the configured provider.
- Keep approved template names/versions and send failures observable in admin settings/logs. Use the current official policy and provider docs during setup; template approval, message pricing, and allowed content can change.
- Record sent/failed/delivered/read status events where the provider supplies them. Retry transient failures; route permanent failures to the dashboard/manual follow-up queue.
- Do not make AI or keyword classification authoritative for payment, cancellation, refund, or address changes. Use interactive options or confirmation prompts and preserve human escalation.

### 6.9 Shipping, taxes, and returns

- First release supports admin-entered shipping fee, carrier name, tracking number, tracking URL, and dispatch/delivery states. A courier API is optional and should not block core order handling.
- Tax and shipping must be explicit invoice line items. Configure tax handling with the business/accounting owner for the target market before launch; do not silently assume a tax rule.
- Store an immutable invoice snapshot for every version: line items, subtotal, discounts, tax, shipping, other fees, grand total, currency, creation timestamp, creator, and status.
- Cancellations/refunds follow explicit order-state rules and the business policy. Restock items only when the business rule says stock is sellable again; never restore inventory blindly after every refund.
- Create real shipping, return/refund, privacy, and payment method policies before public launch.
- Confirm regional tax, privacy, and consumer-law obligations with the responsible business/legal owner before production.

### 6.10 AI-generated product media and uploads

- Save product as a draft before requesting image generation.
- `ImageGenerationService` builds a prompt from validated catalog fields and a fixed art direction. User-entered text is data, not privileged instructions.
- Create an `image_generation_jobs` record with status, requester, idempotency key, provider job ID, retry count, timestamps, and safe error code.
- Run long jobs asynchronously where possible. Never hold an HTTP request open indefinitely for generation.
- Store provider credentials only in backend environment variables. Put generated outputs into staging/private storage until reviewed; persist storage keys, not arbitrary client-supplied paths.
- The admin can accept, regenerate, upload instead, add angles, replace, reorder, select the primary asset, or remove an asset. Validate ownership and product association for every operation.
- Uploads must validate allowed MIME type and file signature, maximum size/dimensions, safe generated storage key, and ownership. Process images into safe web formats/variants as needed.
- Only accepted/ready primary media may be used when publishing. Failed generation never deletes product text or the draft.
- After publish/update, the next public catalog read uses the updated primary image/media list through the same product query path.

### 6.11 Admin dashboard analytics

Use persisted events and database aggregates for metrics such as sales, orders, average order value, low-stock variants, and top-selling products. Define each metric precisely and use a consistent timezone and currency basis. Do not claim exact unique visitor counts unless an analytics mechanism actually captures them with the required consent/privacy behavior. Keep analytics read-only and permission-controlled.

---

## 7. Database model: recommended first release

Use PostgreSQL with Prisma for typed access and migrations unless an existing stack has already been selected. Use database constraints for uniqueness and referential integrity; do not rely only on form checks.

Core tables/entities for the no-customer-account release:

- `admin_users`: id, normalized username/email, password hash, role, status, created/updated timestamps.
- `admin_sessions`: hashed/opaque session ID, admin user ID, expiry, revoked timestamp, safe metadata.
- `categories`, `collections`, and join tables for product association and ordering.
- `products`: stable ID, name, unique slug, descriptions, material, category ID, status, SEO fields, published timestamp.
- `product_variants`: product ID, unique SKU where present, size, color, price override or inherited price rule, active flag.
- `inventory_items` or variant stock columns plus `inventory_movements` and `inventory_reservations` for stock history/concurrency-safe guest checkout.
- `media_assets`: source (`ai_generated`/`uploaded`), status, storage key, MIME/dimensions/size, alt text, provenance, ownership, created timestamp.
- `product_media`: product ID, asset ID, sort order, primary flag.
- `guest_carts`, `guest_cart_items`: opaque guest cart token hash/expiry, variant IDs, quantity; browser totals are never authoritative.
- `orders`: order number, status, normalized WhatsApp phone, customer name, WhatsApp consent snapshot, shipping-address snapshot, currency, idempotency key, current invoice version, hashed guest order-access token metadata, timestamps.
- `order_items`: immutable product name/SKU/size/color/image URL or media reference snapshot, unit price, quantity, line discount and line total.
- `invoices`, `invoice_lines`: versioned item subtotal, discounts, tax, shipping, other clearly named fees, grand total, currency, creator, creation time, superseded status.
- `manual_payments`: order/invoice version, requested amount, payment method label, state, QR/config reference, transaction/UTR reference, verifier admin, verification timestamp, notes.
- `payment_proofs`: order/manual payment ID, private storage key, MIME/size, inbound WhatsApp message ID, received time, review status, reviewer, retention/deletion metadata.
- `shipments`: order, carrier, tracking number/URL, shipped/delivered times, shipping charge snapshot, notes.
- `cancellation_requests`, `refund_requests`, `refund_records`: source (`website`/`whatsapp`/`admin`), request reason, state, decision, manual transfer reference and audit data.
- `whatsapp_conversations`: normalized customer phone, latest inbound message timestamp, customer-service window state, opt-in state, associated order only when reliable.
- `whatsapp_messages`: provider message ID, inbound/outbound, message/template type, media reference, status events, safe payload metadata, timestamps and related order/request.
- `whatsapp_webhook_events`: provider event/message IDs for deduplication and retry safety.
- `store_settings`: active payment QR media key, UPI/payment label/instructions, invoice prefix, shipping defaults, WhatsApp template mapping and business contact settings. Restrict writes to admin.
- `image_generation_jobs`: provider/job IDs, request status, idempotency, requester, retries, safe failure codes.
- `audit_events`: actor admin, action, resource type/ID, timestamp, correlation ID, safe before/after summary.
- Optional `outbox_events`: committed events waiting for WhatsApp delivery, cache revalidation, or another durable queue.


Model money as integer minor units with currency. Store timestamps consistently in UTC. Add indexes for public slug/category/status queries, SKU lookup, order number/customer/status/date, reservation expiry, and webhook deduplication. Define cascade behavior deliberately; never cascade-delete order history because a product/media record was removed.

---

## 8. API design and endpoint map

Base path: `/api/v1`. Return JSON. Keep response shapes consistent and version changes deliberately.

Suggested success envelope:

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

Suggested error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please review the submitted fields.",
    "fields": { "name": "Name is required." },
    "requestId": "..."
  }
}
```

Do not expose stack traces, SQL, secrets, provider payloads, or internal file paths to clients. Use stable machine-readable error codes.

### Public catalog

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/products` | Published catalog; search/filter/sort/paginate |
| `GET` | `/api/v1/products/:slug` | Published product detail with variants and ordered ready media |
| `GET` | `/api/v1/categories` | Published categories |
| `GET` | `/api/v1/collections/:slug` | Collection metadata and published products |
| `GET` | `/api/v1/search` | Search published products only |

### Guest cart, checkout, and order access

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Read current opaque guest cart | Guest cart token |
| `POST` | `/api/v1/cart/items` | Add a variant/quantity | Guest cart token |
| `PATCH/DELETE` | `/api/v1/cart/items/:itemId` | Update/remove a cart line | Guest cart token |
| `POST` | `/api/v1/checkout/quote` | Revalidate cart and return item subtotal/known charges estimate | Public, rate-limited |
| `POST` | `/api/v1/orders` | Create guest order from current cart and customer/address fields; idempotent | Public, rate-limited + consent required |
| `GET` | `/api/v1/guest/orders/:token` | Read scoped order status and latest invoice using a high-entropy token | Token-scoped, rate-limited |
| `POST` | `/api/v1/guest/orders/:token/cancellation-requests` | Request cancellation; same domain service as WhatsApp | Token-scoped, rate-limited |
| `POST` | `/api/v1/guest/orders/:token/confirm-invoice` | Confirm revised final bill if business policy requires customer confirmation | Token-scoped |

There are no customer `/register`, `/login`, `/me`, `/addresses`, or customer-authenticated order endpoints in this release. The WhatsApp webhook can create cancellation/refund requests only after safe order matching and confirmation rules.

### Admin catalog and operations

| Method | Endpoint | Purpose |
|---|---|---|
| `GET/POST` | `/api/v1/admin/products` | Search/list products; create draft |
| `GET/PATCH` | `/api/v1/admin/products/:id` | Read/edit product and variants |
| `POST` | `/api/v1/admin/products/:id/publish` | Validate and publish product |
| `POST` | `/api/v1/admin/products/:id/archive` | Archive product |
| `POST` | `/api/v1/admin/products/:id/duplicate` | Create a new draft from a product |
| `POST` | `/api/v1/admin/products/:id/media/generate` | Queue AI image generation |
| `GET` | `/api/v1/admin/media/jobs/:jobId` | Poll generation status |
| `POST` | `/api/v1/admin/products/:id/media/uploads` | Create authorized upload flow or accept validated upload |
| `PATCH/DELETE` | `/api/v1/admin/products/:id/media/:mediaId` | Reorder/set primary/update alt/remove asset |
| `GET/PATCH` | `/api/v1/admin/inventory/:variantId` | View/adjust stock with a reason |
| `GET` | `/api/v1/admin/orders` | List/filter orders |
| `GET` | `/api/v1/admin/orders/:id` | Order detail |
| `POST` | `/api/v1/admin/orders/:id/invoices` | Create/update a versioned final invoice with shipping/other costs | Admin
| `POST` | `/api/v1/admin/orders/:id/send-payment-request` | Send final bill + configured QR over WhatsApp | Admin
| `POST` | `/api/v1/admin/orders/:id/payment-proofs/:proofId/review` | Mark proof accepted/rejected for review; does not alone mark paid | Admin
| `POST` | `/api/v1/admin/orders/:id/verify-payment` | Record independently verified bank/UPI transaction and mark paid | Admin
| `POST` | `/api/v1/admin/orders/:id/shipments` | Add tracking details and trigger WhatsApp dispatch update | Admin
| `POST` | `/api/v1/admin/orders/:id/cancellation/decision` | Approve/reject cancellation and record reason | Admin
| `POST` | `/api/v1/admin/orders/:id/refunds` | Record/approve manual refund and reference; no gateway transfer in this release | Admin
| `GET/PATCH` | `/api/v1/admin/settings/payment` | Configure payment QR/instructions; never expose storage key to public clients | Admin
| `GET` | `/api/v1/admin/whatsapp/messages` | Search message status/event log and follow-up failures | Admin
| `GET/POST/PATCH` | `/api/v1/admin/promotions...` | Manage discounts where implemented |
| `GET` | `/api/v1/admin/dashboard/summary` | Permission-controlled business metrics |
| `GET` | `/api/v1/admin/audit-events` | Search audit records, restricted to appropriate roles |

### Webhooks and internal routes

- `GET/POST /api/v1/webhooks/whatsapp` — perform provider subscription verification and verify message webhook signatures (for Meta, validate `X-Hub-Signature-256` against the raw body using the app secret); deduplicate event/message IDs; persist inbound messages/media and enqueue workflows. No payment provider webhook exists in the first release.
- `POST /api/v1/webhooks/media/:provider` — only if the chosen image provider supports authenticated callbacks.
- Internal cache invalidation/event routes must be private, authenticated with a rotating secret or service identity, and unavailable to ordinary public/admin clients. WhatsApp sending must use a durable outbox/queue with per-message idempotency and retry handling.
- `GET /health/live` checks the process is alive; `GET /health/ready` verifies required dependencies such as the database can serve traffic. Do not expose sensitive diagnostics.

Finalize the OpenAPI schemas before generating a frontend API client. Use pagination (`cursor` or page/limit with a hard maximum), field allowlists for sorting, and consistent filtering semantics.

---

## 9. How the admin product form updates product cards

This flow is the key acceptance path and must be implemented end-to-end.

```text
Admin opens /admin/products/new
          |
          v
Enters name, category, description, material,
size/color variants, price, stock and images preference
          |
          v
POST /api/v1/admin/products -> authenticated Express API
          |
          v
Controller validates request -> ProductService.createDraft()
          |
          v
PostgreSQL persists draft + variants -> audit event
          |
          v
AI generation job runs OR admin uploads/replaces media
          |
          v
Admin reviews/selects primary image and other gallery assets
          |
          v
POST /api/v1/admin/products/:id/publish
          |
          v
Service validates all publish requirements and atomically updates status
          |
          v
Backend invalidates catalog cache / emits product.updated event
          |
          v
Next.js queries GET /api/v1/products and renders ProductCard from DTO
```

Rules for this flow:

1. The admin preview may render the in-progress form state, but public pages must read only from the published catalog API.
2. The `ProductCard` component accepts a typed product view model and renders it; it does not own product storage, generate prices, or determine publish status.
3. After a successful admin mutation, invalidate/revalidate the relevant product detail, category/collection, search, sitemap, and home featured-product caches. Start with dynamic/no-store catalog reads if cache invalidation has not been implemented; correctness is more important than premature caching.
4. Never report “published” to the UI until the backend confirms commit success.
5. On failure, keep form values and media previews where safe, show actionable validation/error messages, and allow retry without duplicate product or image jobs.

---

## 10. Cache, events, and background work

Start simple. For the first working version, public product fetches can be dynamic or use a short, explicit revalidation window. When caching is introduced:

- Invalidate only after a successful database commit.
- Invalidate all derived routes affected by a product/category change.
- Use a transactional outbox or durable queue if a cache invalidation event must not be lost between DB commit and event publish.
- If Next.js revalidation is triggered from Express, expose an internal signed endpoint and verify its service secret; never trust a public unauthenticated product ID to trigger arbitrary cache operations.
- A cache miss or revalidation failure must not make draft data public.

Background jobs are appropriate for AI generation, image processing, optional email, expired inventory reservation release, abandoned guest-order cleanup, WhatsApp message retry, and webhook processing. If jobs matter to order or inventory correctness, persist their state and use a durable queue (for example Redis + BullMQ or a managed equivalent). Do not rely on an in-memory `setTimeout` in a horizontally scaled production API.

---

## 11. Security requirements

- Parse all backend environment variables at startup; fail fast for missing production secrets or invalid configuration.
- Use TLS in production and configure trusted proxy behavior explicitly if behind a load balancer.
- Use Helmet, strict request body limits, allowlisted CORS, input validation, output DTO mapping, and consistent rate limits.
- Use parameterized ORM queries; never concatenate user input into SQL. Allowlist sort columns and filter operators.
- Apply CSRF protections for cookie-authenticated mutations. Use secure session cookies and rotate/revoke sessions on key events.
- Authorize every admin endpoint and every customer-owned resource server-side. Prevent IDOR by checking owner/resource scope in the service or query.
- Protect admin login from brute force/credential stuffing, guest checkout and order lookup from spam/enumeration, WhatsApp webhook endpoints from forgery/replay, and AI generation from abuse.
- Validate file signature as well as MIME/extension; limit file size/dimensions, generate storage keys server-side, and store accepted files outside the executable application directory.
- Verify WhatsApp webhook signatures and deduplicate external events. Make guest order creation, WhatsApp sends, invoice creation, manual payment verification, cancellation/refund requests, and inventory transitions idempotent where retries can occur.
- Keep WhatsApp, database, storage, and AI-provider secrets in backend environment variables only. Never prefix them with `NEXT_PUBLIC_` or place them in frontend source.
- Redact passwords, cookies, session tokens, payment secrets, address/phone details, and provider credentials from logs. Log request IDs and safe event metadata.
- Write audit events for product publishing, price/stock edits, final invoice changes, payment verification, order-state changes, cancellations, manual refunds, WhatsApp admin actions, role changes, and relevant authentication/security events.
- Use least-privilege database credentials, backups, migration review, and a documented restore procedure.
- Add dependency scanning, secret scanning, lockfile review, and safe error reporting to CI.

---

## 12. Operational requirements and environment configuration

### Frontend environment (`frontend/.env.example`)

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000/api/v1
```

`API_BASE_URL` is used in server-only API calls. If exposed to browser code, only use a public base URL deliberately selected for the deployment. Prefer same-origin `/api/v1` through a reverse proxy in production.

### Backend environment (`backend/.env.example`)

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/fashion_commerce
SESSION_SECRET=replace-with-a-long-random-secret
FRONTEND_ORIGIN=http://localhost:3000
TRUST_PROXY=false

# Add only when the integrations are selected/configured:
# REDIS_URL=
# OBJECT_STORAGE_ENDPOINT=
# OBJECT_STORAGE_BUCKET=
# OBJECT_STORAGE_ACCESS_KEY_ID=
# OBJECT_STORAGE_SECRET_ACCESS_KEY=
# WHATSAPP_PROVIDER=meta-cloud-api
# WHATSAPP_GRAPH_API_VERSION=vXX.X  # select current supported version during setup
# WHATSAPP_PHONE_NUMBER_ID=
# WHATSAPP_BUSINESS_ACCOUNT_ID=
# WHATSAPP_ACCESS_TOKEN=
# WHATSAPP_APP_SECRET=
# WHATSAPP_VERIFY_TOKEN=
# ADMIN_WHATSAPP_RECIPIENTS=+91XXXXXXXXXX
# IMAGE_GENERATION_API_KEY=
# EMAIL_PROVIDER_API_KEY=  # optional; WhatsApp is the primary order channel
# INTERNAL_REVALIDATION_SECRET=
```

Use a validated config module for each application. The values above are examples only; never commit real values. Keep the frontend and backend `.env` files independent. Avoid copying backend-only secrets into frontend variables.

### Deployment shape

- Build and deploy `frontend` and `backend` independently; they may use separate hosting services.
- Run PostgreSQL as a managed database or protected service. Only the backend network/runtime can reach it.
- Route public HTTPS traffic to Next.js and `/api/v1` to Express through a reverse proxy/API gateway where possible.
- Run migrations as an explicit release step, not automatically on every API instance startup.
- Configure health checks, graceful shutdown, structured logs, request IDs, alerts, backup schedules, and provider webhook URLs.
- Keep media in durable object storage/CDN rather than on ephemeral API-server disk.

---

## 13. Testing and acceptance criteria

### Backend tests

- Unit test pricing, invoice versioning, shipping/other fee validation, allowed order transitions, inventory reservations, cancellation eligibility, refund limits, WhatsApp routing intents, and token generation/expiry.
- Integration test with a test database: idempotent guest order creation, invoice revisions, stock hold expiry, concurrent checkout/reservation, rollback, payment proof association, and webhook deduplication.
- API tests for anonymous admin access denial, admin role checks, guest-token scoping, order-number enumeration resistance, checkout validation, opt-in enforcement, and rate limits.
- Security tests for forged WhatsApp webhook signature, replayed message IDs, malicious media, unauthenticated payment marking, duplicate UTR/reference, stale invoice payment, CSRF for admin cookies, and IDOR.
- Test WhatsApp/storage/image provider interfaces using deterministic fakes and an approved sandbox/test recipient; never message arbitrary production customers from tests.

### Frontend tests

- Component tests for `ProductCard`, size/color selection, guest cart quantity, checkout field validation and consent, invoice totals, order status page, cancellation form, admin invoice builder, payment-proof review, tracking entry and media upload.
- Playwright flows: public catalog -> product detail -> cart -> guest checkout -> pending admin review; admin login -> quote shipping/final bill -> send payment request (mock provider) -> review proof -> verify payment -> add tracking -> verify simulated WhatsApp notification; website cancellation request and inbound WhatsApp cancellation/refund webhook flow.
- Test message send failures and ensure order placement/admin work still succeeds with the notification queued for retry.
- Visual QA at narrow mobile, tablet, laptop, and desktop widths. Motion QA for reduced-motion behavior, route transitions, cleanup, and keyboard interaction.


### Release acceptance gate

- [ ] `frontend` and `backend` install/build independently and run using documented commands.
- [ ] Frontend contains no database or privileged provider access.
- [ ] Public catalog endpoints never return drafts or archived products.
- [ ] Product card/PDP use backend product DTOs; no product data is duplicated in JSX.
- [ ] Admin login, role checks, CRUD, media review, publish, archive, and audit records work end-to-end.
- [ ] Admin product edit/publish is reflected in subsequent storefront reads without source edits.
- [ ] Guest checkout works without customer registration and safely stores customer/address snapshots.
- [ ] Final itemized invoice includes shipping/tax/other applicable costs before payment QR is sent.
- [ ] A configured QR/payment request can be sent over WhatsApp; product/order notification reaches the admin or remains in a visible retry queue.
- [ ] Screenshot uploads are private and do not automatically mark an order paid.
- [ ] Only an authenticated admin can record a matching, independently verified bank/UPI transaction as paid.
- [ ] Shipping/tracking updates and cancellation/refund communications can be sent via WhatsApp with provider/template constraints respected.
- [ ] Order status changes and manual refunds are audited and idempotent.
- [ ] Critical routes and business rules have automated tests; errors are safe and actionable.
- [ ] Real provider integrations, credentials, hosting, and database setup are clearly distinguished from mocks/demo mode.

