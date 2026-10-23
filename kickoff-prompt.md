# AI Coding Agent Kickoff — Fashion Commerce

> **Execute Milestone 0 only.** This is the copy-paste task prompt for the coding agent when starting implementation in the actual project repository.

## Mission

Start building the fashion e-commerce store as a real two-application project: a Next.js storefront/admin frontend in `frontend/` and a separate Express + TypeScript API in `backend/`. The first working vertical slice must include a running backend, PostgreSQL connectivity, secure administrator authentication, a functioning `/admin/login` screen, a protected `/admin` shell, and a storefront home shell based on `design.md`.

## Read these project files first

1. `design.md`
2. `architecture.md`
3. `dependencies.md`
4. `commerce-workflow.md`
5. `agent.md`

If repository code exists, inspect it before modifying anything. Treat existing source and uncommitted work as user-owned. Do not overwrite, delete, reset, or move it without inspecting the diff and preserving unrelated changes.

## Scope authorized now: Milestone 0 only

1. Inspect current working directory, Git status/branch, files, package manager/lockfile, runtime version, existing routes, tests and environment files. Identify what already works; do not rebuild it unnecessarily.
2. Establish or repair `frontend/` (Next.js App Router + React + TypeScript + Tailwind), `backend/` (Express + TypeScript), and `contracts/openapi.yaml`. Prefer the existing package manager; otherwise use one root `pnpm` workspace and one lockfile.
3. Configure strict TypeScript and runnable scripts. Create `.env.example` files with placeholders only. Never create or commit real secrets.
4. Configure PostgreSQL and Prisma in the backend only; add a local Compose service if needed. Add environment validation, migrations, liveness/readiness endpoints and clear setup instructions.
5. Implement working administrator login, logout, and current-session API endpoints in Express. Use a maintained server-side session store backed by PostgreSQL, secure password hashing (prefer Argon2id), session rotation after successful login, session revocation on logout, login rate limiting, schema validation, safe generic credential errors, CSRF protection for state-changing cookie-authenticated requests, and explicit CORS origins.
6. Add an `AdminUser` data model and a one-time interactive CLI to create the first administrator. Do not add public admin registration, default credentials, customer accounts, or customer login. Refuse bootstrap if an active administrator already exists.
7. Create `/admin/login` and a protected `/admin` dashboard shell. The frontend's route guard is for UX only; the Express API must reject anonymous or invalid-session requests. Add a logout interaction and session loading/error handling.
8. Create a styled storefront home shell and shared layout according to `design.md`; temporary products, if needed for layout only, must be explicitly marked fixtures and isolated behind a mock adapter. Do not implement product CRUD, checkout, payments, AI generation, WhatsApp, GSAP polish, or deployment in this milestone.
9. Add request IDs, Helmet/security headers, body-size limits, centralized error handling, redacted structured logs and tests for health/readiness, migrations/connectivity, first-admin bootstrap, valid/invalid login, session retrieval, logout/revocation, anonymous protected API rejection, CSRF and login rate limiting.
10. Run install, migrations, typecheck, lint, tests and production builds that the repository supports. Start both apps and verify the login flow in a browser if a browser/preview tool is available. Report any checks that cannot run and the exact blocker; never report a check as passed unless it ran.
11. Update README/setup instructions with exact local commands and environment requirements. Do not deploy, buy services, send WhatsApp messages, generate paid media or change production credentials.

## First milestone acceptance criteria

- Frontend and backend start independently.
- Express connects to PostgreSQL; migrations succeed; only backend has DB access.
- Storefront home shell loads.
- Admin bootstrap creates an admin only through a controlled CLI; no public registration exists.
- Admin can log in, access the protected admin shell, request its session and log out.
- Express denies protected API calls with no session and after logout.
- Session cookie flags, CSRF defense, login rate limit, validation and safe error behavior are verified.
- Typecheck, lint, relevant tests and production builds pass, or precise blockers are reported.

## Mandatory stop behavior

After Milestone 0, write the Section 8 report from `agent.md`: completed work, exact commands and test results, browser/viewport checks, database/auth integration state, missing credentials, known issues, and next milestone. **Then stop all coding and wait for explicit user approval.** Do not start Milestone 1 or silently scaffold its product CRUD/catalog functionality. If a gate fails, fix only within Milestone 0 or report the blocker.

Begin by inspecting the repository now. Do not respond with a plan only; make the allowed changes, run the checks, and report verified results.
