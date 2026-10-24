# BHARAT — Luxury Menswear E-Commerce Atelier

An editorial menswear e-commerce platform and atelier operations system engineered with an uncompromising architectural boundary between presentation and commerce authority:

- **Storefront & Admin Experience (`/frontend`)**: Next.js 15 App Router, React 19, TypeScript, Vanilla CSS design tokens with Tailwind CSS utilities, and GSAP 3 animation pipeline.
- **Commerce & Identity Core (`/backend`)**: Express.js, TypeScript, PostgreSQL 16, Prisma ORM, Argon2id password hashing, and stateful server-side session management.
- **Canonical API Contract (`/contracts/openapi.yaml`)**: OpenAPI 3.1 specification.

---

## Architectural Philosophy & Core Tenets

1. **Guest-Only Commerce Model**: There are no customer registrations, passwords, or customer accounts. Patrons transact via guest checkout and track their orders using cryptographically random 32-byte opaque tokens hashed with SHA-256 in the database.
2. **Server-Enforced Commercial Authority**: The frontend owns visual presentation and responsiveness. The Express core is the single source of truth for pricing minor units (paise), inventory availability, stock reservation holds, and state-machine transitions.
3. **Manual Bank Ledger Settlement (QR Payment)**: Patrons scan a verified dynamic UPI QR code or click an app deep link (`upi://pay?...`). Uploading a transaction screenshot transitions the order to `PAYMENT_PROOF_RECEIVED`. **A proof upload alone never marks an order paid.** Staff independently verify the credit in their bank console before marking the order `PAID`, which permanently decrements inventory.
4. **Controlled Administrative Identity**: Public admin registration is permanently disabled. Initial administrator provisioning is performed exclusively via a secure CLI script (`npm run admin:bootstrap --workspace=backend`).
5. **WhatsApp-First Transactional Lifecycle**: Outbound communications (order receipt, verified invoice with payment instructions, proof acknowledgment, payment confirmation, and shipment dispatch with tracking URL) are recorded and dispatched through an audit-logged WhatsApp service.

---

## Monorepo Layout

```text
bk-by-bharat/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Relational schema (Catalog, Orders, Invoices, Media, WhatsApp)
│   │   └── migrations/             # Timestamped SQL migrations
│   ├── src/
│   │   ├── config/                 # Typed environment & constants
│   │   ├── db/                     # Prisma singleton & idempotent catalog seeder
│   │   ├── middleware/             # Rate limiting, CSRF, auth, RBAC, request correlation
│   │   ├── modules/
│   │   │   ├── admin-auth/         # Argon2id authentication & session rotation
│   │   │   ├── catalog/            # Products, categories, variants, and admin CRUD
│   │   │   ├── commerce/           # Guest checkout, invoicing, QR verification & shipments
│   │   │   ├── media/              # AI Lookbook synthesis & secure uploads
│   │   │   └── whatsapp/           # Outbound dispatch & inbound webhook processing
│   │   ├── routes/                 # Express v1 central router
│   │   └── app.ts                  # Application assembly & static /uploads serving
│   ├── tests/                      # Vitest test suite (43 integration tests)
│   └── uploads/                    # Local storage for direct and synthesized media
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (store)/            # Storefront routes (PDP, Collections, Checkout, Order Status)
│   │   │   └── admin/              # Operations portal (Catalog, Orders, Proof Review, Settings)
│   │   ├── components/             # Reusable UI & editorial motion components
│   │   ├── context/                # Client CartContext with persistent local bag
│   │   ├── lib/
│   │   │   ├── api/                # Typed API clients (catalog, commerce, media, auth)
│   │   │   └── motion/             # Centralized GSAP 3 configuration & hooks
│   └── next.config.ts              # Reverse proxy rewrite (/api/v1 -> backend)
├── contracts/
│   └── openapi.yaml                # OpenAPI 3.1 specification
└── docker-compose.yml              # Local PostgreSQL 16 container setup
```

---

## Prerequisites

- **Node.js**: v22+ LTS (verified on Node.js v22.14.0)
- **Package Manager**: npm workspaces (v10+)
- **Database**: PostgreSQL 16 (local or Docker container)
- **Container Engine**: Docker Desktop (recommended for local database)

---

## Local Development Setup

### 1. Clone & Install Dependencies

From the repository root:

```bash
npm install
```

### 2. Start PostgreSQL 16 Container

```bash
npm run db:up
# Or: docker compose up -d
```

Verify that the `fashion_commerce_postgres` container is healthy on port `5432`:

```bash
docker ps
```

### 3. Environment Configuration

Create `.env` in `backend/` and `.env.local` in `frontend/`:

**Backend (`backend/.env`)**:
```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://fashion_user:fashion_password@localhost:5432/fashion_commerce?schema=public
SESSION_SECRET=dev_session_secret_32_chars_minimum_random_key_for_testing
FRONTEND_ORIGIN=http://localhost:3000
TRUST_PROXY=false
```

**Frontend (`frontend/.env.local`)**:
```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000/api/v1
```

### 4. Database Schema Migration & Seeding

```bash
# Generate Prisma Client
npm run prisma:generate --workspace=backend

# Apply SQL migrations
npm run prisma:migrate --workspace=backend

# Seed store settings, categories, and 6 published garments with variants
npx tsx src/db/seed.ts --workspace=backend
```

### 5. Bootstrap Initial Administrator

```bash
npm run admin:bootstrap --workspace=backend -- --username=admin@atelier.local --password=YourStrongPassword123!
```

---

## Running the Applications

Launch both development servers concurrently:

```bash
# Terminal 1: Backend Express Server (Port 4000)
npm run dev:backend

# Terminal 2: Frontend Next.js Server (Port 3000)
npm run dev:frontend
```

### Application URLs:
- **Editorial Storefront**: [http://localhost:3000](http://localhost:3000)
- **Guest Checkout**: [http://localhost:3000/checkout](http://localhost:3000/checkout)
- **Admin Staff Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Admin Order Queue**: [http://localhost:3000/admin/orders](http://localhost:3000/admin/orders)
- **Admin Product Catalog**: [http://localhost:3000/admin/products](http://localhost:3000/admin/products)
- **Payment & UPI Settings**: [http://localhost:3000/admin/settings/payment](http://localhost:3000/admin/settings/payment)
- **WhatsApp Audit Logs**: [http://localhost:3000/admin/whatsapp](http://localhost:3000/admin/whatsapp)
- **Backend Health Liveness**: [http://localhost:4000/health/live](http://localhost:4000/health/live)
- **Backend Health Readiness**: [http://localhost:4000/health/ready](http://localhost:4000/health/ready)

---

## Commercial Workflow Walkthrough

```mermaid
sequenceDiagram
    autonumber
    actor Patron as Guest Patron
    participant Storefront as Next.js Storefront
    participant Core as Express Backend
    participant DB as PostgreSQL
    actor Master as Atelier Master
    participant WA as WhatsApp Service

    Patron->>Storefront: Adds garments to bag & proceeds to checkout
    Patron->>Core: POST /api/v1/orders/checkout (items, contact, consent)
    Core->>DB: Validates stock, calculates prices, generates opaque token & order
    Core-->>WA: Dispatches order receipt template
    Core-->>Storefront: Returns order number & private opaque status token
    Storefront-->>Patron: Displays confirmation & private tracking view

    Master->>Core: GET /api/v1/admin/orders (reviews pending queue)
    Master->>Core: POST /api/v1/admin/orders/:id/invoice (shipping, GST, discount)
    Core->>DB: Atomically increments variant reservedStock & issues Invoice
    Core-->>WA: Dispatches verified bill with UPI QR code & instructions

    Patron->>Storefront: Opens /order-status/:token, scans UPI QR & pays
    Patron->>Core: POST /api/v1/orders/payment-proof (UTR reference & screenshot)
    Core->>DB: Updates status to PAYMENT_PROOF_RECEIVED
    Core-->>WA: Acknowledges proof receipt

    Master->>Core: POST /api/v1/admin/orders/:id/verify-payment (UTR reference)
    Core->>DB: Marks order PAID, decrements stock & clears reservedStock
    Core-->>WA: Dispatches payment confirmed notice & tailoring queue entry

    Master->>Core: POST /api/v1/admin/orders/:id/ship (carrier, trackingNumber, URL)
    Core->>DB: Marks order SHIPPED & creates Shipment record
    Core-->>WA: Dispatches tracking details to patron
```

---

## Quality Gates & Verification

All quality gates pass with zero warnings or errors:

### 1. Backend Test Suite (43 Tests)
```bash
npm run test --workspace=backend
```
- `tests/health.test.ts` (3 tests): Liveness, readiness, and database connection checks.
- `tests/admin-auth.test.ts` (9 tests): Argon2id hashing, session cookies, CSRF protection, and revocation.
- `tests/security.test.ts` (4 tests): CSRF double-submit validation and IP rate limiting.
- `tests/catalog.test.ts` (12 tests): Storefront pagination, slug queries, admin drafting, SKU uniqueness, and publishing.
- `tests/media.test.ts` (5 tests): AI Lookbook draft synthesis, file uploads, mime validation, and media reordering.
- `tests/commerce.test.ts` (10 tests): Guest checkout, opaque tokens, stock reservation holds, payment proof upload (verifying upload never marks paid), bank ledger verification, shipment dispatch, and cancellation release.

### 2. Typechecking Across Workspaces
```bash
npm run typecheck --workspaces
```

### 3. Production Bundles
```bash
npm run build --workspaces
```

---

## Security Hardening Details

- **CSRF Defense**: State-changing requests enforce matching origin/referer headers and double-submit CSRF cookie validation (`X-CSRF-Token`).
- **Rate Limiting**: IP-based rate limiting on sensitive authentication and commerce routes (`express-rate-limit`).
- **Security Headers**: Standard security headers enforced via `helmet`.
- **Upload Restrictions**: Max 10MB limit and whitelist validation for `image/jpeg`, `image/png`, `image/webp`, and `image/avif`.
- **Authoritative Accounting**: All prices in minor units (paise); integer calculations prevent floating point discrepancies.
- **Opaque Token Privacy**: Database stores only SHA-256 hashes of private status tokens, preventing IDOR or sequential enumeration attacks.

---

## License

Private Proprietary Software — Bharat Atelier New Delhi. All rights reserved.
