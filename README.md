# BHARAT — Fashion E-Commerce Atelier

An editorial menswear e-commerce platform and studio administration system built with an intentional two-application architecture:

- **Storefront & Admin UI (`/frontend`)**: Next.js App Router, React 19, TypeScript, and Tailwind CSS.
- **Commerce & Identity Core (`/backend`)**: Express.js, TypeScript, PostgreSQL, Prisma ORM, and Argon2id session security.
- **Canonical API Contract (`/contracts/openapi.yaml`)**: OpenAPI 3.1 specification.

---

## Architecture Principles

1. **Strict Application Boundary**: The frontend owns presentation; the backend owns authentication, business rules, persistence, and inventory. Next.js never connects to the database directly or exposes provider secrets.
2. **Server-Enforced Security**: Administrator authentication, authorization, session rotation, logout revocation, CSRF origin & double-submit checks, and login rate limiting are enforced inside Express.
3. **Controlled Administrator Bootstrap**: No public admin registration or customer accounts exist. The first administrator is created strictly via a server-side CLI tool.

---

## Prerequisites

- **Node.js**: v22+ LTS (verified on v22.14.0)
- **Package Manager**: npm workspaces (or pnpm)
- **Database**: PostgreSQL 16 (local installation or Docker Compose)
- **Container Engine**: Docker Desktop (optional for local PostgreSQL)

---

## Local Setup & Installation

### 1. Clone & Install Dependencies

From the repository root:

```bash
# Install dependencies across all workspaces
npm install
```

### 2. Start PostgreSQL Database

Start the provided PostgreSQL 16 container:

```bash
npm run db:up
# Or: docker compose up -d
```

Verify the database container is healthy:

```bash
docker ps
```

### 3. Configure Environment Variables

Create `.env` files in both applications from their `.env.example` templates:

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

### 4. Database Migrations & Client Generation

Generate the Prisma client and apply the initial database schema:

```bash
# Generate Prisma Client
npm run prisma:generate --workspace=backend

# Apply migrations
npm run prisma:migrate --workspace=backend
```

### 5. One-Time Administrator Bootstrap

Create the first administrator account via the server-side CLI. Public registration is permanently disabled.

```bash
# Interactive bootstrap:
npm run admin:bootstrap --workspace=backend

# Or non-interactive scripted bootstrap:
npm run admin:bootstrap --workspace=backend -- --username=admin@fashion.local --password=YourStrongPassword123!
```

---

## Running in Development

Start both applications in separate terminal sessions:

```bash
# Start Express Backend (Port 4000)
npm run dev:backend

# Start Next.js Storefront (Port 3000)
npm run dev:frontend
```

Access the applications:
- **Storefront Homepage**: [http://localhost:3000](http://localhost:3000)
- **Admin Staff Login**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Protected Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Backend Health Live**: [http://localhost:4000/health/live](http://localhost:4000/health/live)
- **Backend Health Ready**: [http://localhost:4000/health/ready](http://localhost:4000/health/ready)

---

## Automated Verification & Testing

### Run Backend Unit & Integration Tests

Execute the Vitest suite covering health endpoints, admin authentication, session lifecycle, CSRF defenses, and rate limiting:

```bash
npm run test --workspace=backend
```

### Typecheck & Production Builds

```bash
# Typecheck both applications
npm run typecheck --workspaces

# Build production bundles
npm run build --workspaces
```

---

## API Contract

The API contract is canonically specified at [`contracts/openapi.yaml`](contracts/openapi.yaml).
In production or local development, Next.js reverse-proxies `/api/v1/:path*` to the Express backend to enforce same-origin security and preserve `HttpOnly` cookie behavior.

---

## Motion & Media Architecture (Milestone 2)

The animation and media presentation layer is built on GSAP 3 with `@gsap/react`, `ScrollTrigger`, and `ScrollSmoother`.

### 1. Centralized GSAP Configuration
- **File**: `frontend/src/lib/motion/gsap.ts`
- **Safeguard**: Centralized, idempotent plugin registration runs exclusively on client mounts (`typeof window !== 'undefined'`), eliminating server-side rendering or Next.js hydration mismatches.
- **Motion Tokens**: Durations (`fast: 0.22s`, `ui: 0.3s`, `reveal: 0.75s`, `editorial: 1.0s`) and eases (`power2.out`, `power3.out`) strictly match `design.md`.

### 2. Route Eligibility for ScrollSmoother
ScrollSmoother requires the `#smooth-wrapper` and `#smooth-content` container hierarchy. It is restricted to eligible storefront routes to prevent interference with forms, checkout flows, and operational tooling:
- **Eligible Routes**: Storefront homepage (`/`), collection catalogs (`/collections/*`), product detail showcases (`/products/*`), and craft dossiers (`/craft`).
- **Excluded Routes**: Admin portal (`/admin/*`), guest checkout submission (`/checkout`), order confirmation screens (`/orders/*`), and private status views (`/order-status/*`).
- **Fixed Layer Isolation**: Viewport-fixed overlays—including `CartDrawer` (in RootLayout) and modal dialogs—are structured outside transformed content (`#smooth-content`), preventing browser coordinate clipping and stacking issues.

### 3. Reusable Motion Components
- `<SectionReveal>`: Scoped headline and section entrance (`top 82%`, `once: true`, `power3.out`).
- `<StaggeredGrid>`: Scoped entrance targeting `[data-grid-item]` elements with controlled stagger (`0.06s`) as product cards scroll into view.
- `<EditorialCropReveal>`: Smooth clip-path reveal for lifestyle and craft storytelling frames.
- `<ParallaxFrame>`: Subtle vertical parallax travel (max 4-5%) guarded by `gsap.matchMedia("(min-width: 1024px)")` to run on desktop displays only.
- `<ProductMedia>`: Adaptive image/video media presentation with play promise catch handling (`.play().catch(...)`), muted loop attributes, IntersectionObserver pause-on-offscreen, and accessible still poster fallback.

### 4. Accessibility & Performance Guardrails
- **`prefers-reduced-motion`**: When enabled at the OS or browser level, all GSAP entrance tweens, parallax calculations, and ScrollSmoother instances are bypassed. Content remains 100% visible and interactive with standard native scrolling.
- **Touch Devices**: `smoothTouch: 0` is enforced to preserve native mobile touch momentum scrolling and responsive gesture handling.
- **Cleanup**: React Strict Mode and Next.js route transitions invoke comprehensive teardown (`ScrollSmoother.get()?.kill()`, `ScrollTrigger.getAll().forEach(t => t.kill())`), preventing memory leaks, duplicate instances, and stale trigger bounding boxes.
- **Interaction Protection**: No animations touch size chips, quantity buttons, form inputs, focus rings, or checkout submission controls.
