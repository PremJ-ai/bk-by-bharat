# Agent Workflow & Engineering Instructions — Fashion Commerce

This file defines how an autonomous coding agent should plan, implement, observe, test, and verify the project. Work from `design.md` first, then `architecture.md`, then `dependencies.md`. These documents are authoritative unless the repository contains a newer explicitly approved decision.

## 1. Operating principles

1. **Inspect before changing.** Read the repository tree, package manifest, lockfile, existing app routes, current tests, and the uploaded design references before selecting or replacing tools.
2. **Keep moving without repetitive permission prompts.** Once a task is specified, make safe implementation decisions and continue through develop → run → inspect → test → fix. Do not ask “should I continue?” at each normal step. Ask only when a decision genuinely requires unavailable credentials, irreversible external action, material cost, or an unresolved business decision.
3. **Deliver working increments.** Implement a coherent milestone, run it locally, examine the actual output, fix defects, and then proceed. Do not produce only plans or stub every page.
4. **Data before duplicated UI.** Build the product type/schema and reusable `ProductCard` before wiring multiple pages to product data. Storefront and admin preview share the same product display component.
5. **Security is a design requirement.** Do not postpone authentication, authorization, upload validation, or server-side validation until after UI completion.
6. **No false completion claims.** State exactly which commands and tests ran and their results. Do not claim a hosted deployment, live AI generation, or real database integration unless it was actually configured and verified.
7. **Preserve user work.** Never overwrite existing files or discard uncommitted changes without first inspecting the diff and reconciling conflicts. Do not print secrets to logs.

## 2. Startup / repository reconnaissance

Before coding:

- Inspect current working directory and repository status (`git status`, branch, recent commits).
- List files to understand framework, routes, scripts, lockfile, environment examples, styling, tests, and CI.
- Read any existing `design.md`, `architecture.md`, `dependencies.md`, `agent.md`, README, package manifest, and relevant source components. If the supplied reference ZIP is present, inspect its assets and existing `DESIGN.md`; use them for design cues, not to copy their static implementation wholesale.
- Identify what already works and do not rebuild functioning pieces unnecessarily.
- Run baseline install/typecheck/lint/tests/build where the current repository supports them. Record failures that predate changes.
- If a decision is not specified, prefer the least-complex secure option consistent with the stack in the design/architecture docs; document the assumption in the final summary rather than blocking on routine choices.

## 3. Mandatory implementation order

### Milestone 0 — Repository and service foundation

1. Establish a monorepo with separate `frontend/` and `backend/` applications, each with its own `package.json`, strict TypeScript settings, scripts, and `.env.example`; keep one package manager/lockfile strategy.
2. Bootstrap Next.js App Router + React + Tailwind in `frontend/` and Express + TypeScript in `backend/`.
3. Add `/contracts/openapi.yaml` as the source API contract. Add a health endpoint and typed backend environment validation.
4. Select PostgreSQL + Prisma for backend persistence; do not install or import the ORM in `frontend/`.
5. Establish request IDs, centralized errors, security headers, validation middleware, and a documented auth/session approach in Express.
6. Define global design tokens, fonts, `PageContainer`, typography, button/input states, and breakpoints in the frontend.
7. Establish the storefront layout and a separate admin layout. Verify both apps start independently before proceeding.

**Gate:** no hard-coded secrets; frontend and backend start independently; only backend can access the database; API health/typecheck/build checks pass or known baseline failures are documented.

### Milestone 1 — Frontend skeleton and responsive layouts

Build visual pages using typed mock fixtures only as a temporary UI layer, clearly separate from production data:

1. Storefront announcement/header/navigation/footer.
2. Home hero, split editorial feature, ticker, featured product grid, campaign/video block, craft/service features.
3. Collection landing page: masthead, breadcrumbs, filters/sort UI, product grid, empty/loading/error states.
4. Product card and product media components with hover/focus/touch fallback.
5. Product detail page: gallery, name/price/material, size selector, stock/availability, primary action and care/shipping content.
6. Responsive layouts across target viewport sizes.
7. Admin shell, product listing table, create/edit form layout, AI image review panel, upload/reorder/primary-image controls as component states.
8. Guest checkout, order confirmation/status token page, cancellation request UX, and WhatsApp support link. Do not add customer registration/login pages.
9. Admin orders queue/detail, invoice builder with shipping/other-fee lines, payment QR settings, screenshot-proof review, manual payment verification, shipment/tracking fields, cancellation/refund request review, and WhatsApp message status UI.

Do not pretend mock controls have production behavior. Keep fixtures behind a clearly named mock adapter until Milestone 3.

**Gate:** major pages are visually coherent, responsive, keyboard usable, and do not depend on GSAP to make content visible.

### Milestone 2 — Motion and media presentation

1. Install and verify GSAP + `@gsap/react`.
2. Register `ScrollTrigger` centrally in client-only code; use scoped hook/context cleanup.
3. Create the singleton storefront scroll smoother only after confirming the `#smooth-wrapper` / `#smooth-content` layout and fixed overlay behavior.
4. Implement motion hooks for section reveal, product-grid entry, image parallax/reveal, and editorial video visibility/playback.
5. Implement reduced-motion fallback and native-scroll mode.
6. Test responsive `matchMedia` branches, route transitions, dynamic grid changes, image load/refresh behavior, and component unmount cleanup.
7. Add AI-generated initial catalog image assets or configured demo media using the specified art direction. Do not use competitor image URLs from the reference files.

**Gate:** no duplicate ScrollSmoother instances, orphaned ScrollTriggers, scroll lock, console warnings, or invisible content without JavaScript; touch/reduced-motion mode remains usable.

### Milestone 3 — Backend product domain and persistence

1. Implement typed domain entities and Zod schemas in `backend/` based on `architecture.md`.
2. Add PostgreSQL/Prisma schema and migrations for admin users/sessions, products, variants, categories, media, guest carts, guest orders, invoice versions, manual payment proofs, shipments, WhatsApp messages/webhook events, and audit events. Do not create customer accounts.
3. Implement Express routes, controllers, services, repositories, and response DTO mappers. Keep database access entirely in backend repositories/services; never access it from React/Next.js.
4. Seed a small realistic catalog with AI-generated demo media and product data marked as seed/demo.
5. Connect the Next.js frontend to Express using the typed API client; replace temporary fixtures with API-backed catalog reads. Public API queries must filter to `published` only.
6. Add currency formatting and shared view-model mapping for card and PDP fields.
7. Test slug/SKU uniqueness, status transitions, inventory rules, media relation changes, and transaction rollback.

**Gate:** home, collection, product card, and PDP read from one canonical repository/service path; product fields are not duplicated in JSX.

### Milestone 4 — Express authentication and admin product CRUD

1. Configure a maintained authentication/session approach in `backend/`. Create a secure admin bootstrap path; do not expose public admin self-registration.
2. Enforce role/permission checks in Express middleware and again at sensitive service boundaries on every admin mutation. Frontend route guards are UX only.
3. Implement list/search/filter/paginate products and add/edit/archive flows.
4. Implement inline errors, dirty form confirmation where helpful, save draft, publish, archive, and clear server error state.
5. Ensure public data cache is revalidated after a successful committed mutation; keep draft/archived products hidden.
6. Add an audit record for key admin actions.
7. Add backend API/integration tests for anonymous access, wrong-role access, forged product IDs, invalid prices, duplicate slug/SKU, and publishing incomplete products.

**Gate:** an authorized admin can add/edit/publish a product and see the changes in the public product card without a source-code change; an unauthenticated visitor cannot read or mutate admin data.

### Milestone 5 — AI image generation and upload

1. Select the provider based on available credentials and budget; make selection a required configuration, not a hard-coded assumption.
2. Implement a server-only `ImageGenerationProvider` adapter and generation-job status model. Persist draft before starting generation.
3. Build prompt templates from product fields and art direction; add idempotency, request rate limits, quotas, timeout/retry strategy, and safe error reporting.
4. Store generated previews in staging/private media storage with source/provenance metadata.
5. Implement review actions: accept, regenerate, upload instead, add another image, reorder, set primary, remove with confirmation.
6. Validate all uploads using allowlisted types, magic bytes, size/dimensions, ownership, and safe generated storage keys. Only ready/accepted media can be published.
7. If credentials are unavailable, make the UI's disabled/unconfigured state honest and test the upload replacement flow; do not claim actual generation works.

**Gate:** a failed generation does not lose the draft; asset replacement is safe; primary-image selection is reflected in ProductCard/PDP; no provider key reaches client code.

### Milestone 6 — Guest checkout, invoicing, QR payment and WhatsApp commerce

1. Implement guest cart and checkout without customer registration. Require name, WhatsApp number, delivery address and explicit transactional-message consent.
2. Create immutable order/item/address snapshots and a random guest status/cancellation token. Store only a token hash; order number alone must not grant access.
3. Implement admin order review and a versioned final invoice that itemizes product subtotal, discounts, applicable tax, shipping, packaging/other charges, and grand total. Do not send payment QR until the amount is final and visible to the customer.
4. Implement the admin payment-settings screen for configuring the QR image and payment instructions. Keep QR storage private/admin-controlled.
5. Implement a WhatsApp provider adapter, outbound queue/outbox, admin order notification with product image/order summary, payment request/invoice + QR message, inbound message/media webhook, message status tracking, retries, and a human follow-up queue. Use consent plus approved templates where required by the current WhatsApp rules. Never assume website submission opens a 24-hour WhatsApp window.
6. Ingest customer payment screenshots into private storage and associate them through a reliable order match. Treat screenshot as `payment_proof_received`, not as payment success.
7. Build a payment-review queue. Admin independently checks the bank/UPI transaction and records paid amount, UTR/reference, verifier and time before the order can ship.
8. Implement shipment data entry and WhatsApp tracking update. Implement website and WhatsApp cancellation requests through the same `CancellationService`; route paid/shipped cancellation and all refund requests to an admin decision. Record manual refund amount/reference and send confirmation over WhatsApp.
9. Test outbound template gating, webhook signature checks, deduplication, retry behavior, unmatched screenshots, multiple orders per phone, failed WhatsApp sends, duplicate payment references, invoice revision, and stock restoration.

**Gate:** no customer accounts are present; an order cannot be marked paid because a screenshot arrived; final shipping/other costs are itemized before payment; message failure never loses the order; cancellation/refund requests are traceable and auditable.

### Milestone 7 — Hardening, QA, and deployment readiness

- [ ] Typecheck, lint, unit tests, integration tests, browser tests, production build.
- [ ] Accessibility check: keyboard path, labels/errors, visible focus, dialog focus handling, contrast, alt/captions, reduced motion.
- [ ] Responsive visual QA at 360, 390, 768, 1024, 1280, and 1440px.
- [ ] Verify empty, loading, no results, server error, image missing, video failed, generation failed, permission denied, expired admin session, expired guest order token, invoice revision, payment proof review, and WhatsApp send/webhook failure states.
- [ ] Check all public queries, SEO metadata, sitemap, search, and cache paths exclude drafts/archived products.
- [ ] Test upload limits, file spoofing, guest-token IDOR/order enumeration, CSRF defenses for admin cookie auth, forged/replayed WhatsApp webhooks, rate limits, private payment-proof storage, and audit log safety.
- [ ] Check no `.env`, secrets, tokens, original private uploads, or provider keys were committed.
- [ ] Document local setup, migration/seed commands, one-time admin bootstrap, environment variables, payment QR setup, WhatsApp business/provider setup and approved templates, media provider setup, AI generation configuration, and deployment steps.

## 4. Develop → observe → test → repair loop

Repeat this loop for every milestone and major page—not just at the end.

```text
Select the smallest complete task
          ↓
Inspect code and acceptance criteria
          ↓
Implement a focused change
          ↓
Run app and open the actual page/preview
          ↓
Check layout, interaction, console, and network errors
          ↓
Run typecheck + relevant tests + build when appropriate
          ↓
Fix discovered defects and retest
          ↓
Record completion, remaining risks, and next task
          └─────────────── repeat ────────────────┘
```

If browser/visual preview tools are available, use them to inspect the running application at desktop and mobile sizes. If they are not available, run the project and report the exact verification method/limitation; do not claim visual inspection that did not occur.

## 5. Component implementation standards

- Components are small, typed, single-purpose, and named for their domain role.
- Pages compose components; components do not reach across arbitrary routes or perform their own data access without a clear query boundary.
- Keep server-only modules separate from client components (`server-only` guard where useful).
- Use stable database IDs as React keys; do not use array index for reorderable product media.
- Share currency, availability, size, and media formatters. Do not reimplement pricing/stock logic inside cards, PDP, admin preview, and search results separately.
- Use semantic HTML and accessible names. Do not use clickable `div` in place of a link/button.
- Loading/empty/error states should be first-class components, not ad hoc text inserted only after a bug appears.
- Keep animations isolated in reusable hooks; always clean up on unmount/data changes and support reduced motion.
- Keep product forms usable with keyboard and autofill; preserve entered values when a request fails.
- Add tests for behavior, not implementation details.

## 6. Security guardrails

- Every request boundary is untrusted. Validate with schemas on the server even if the browser validates first.
- Authorization checks are server-side; a hidden button or route redirect is not access control.
- Never expose `DATABASE_URL`, auth secret, storage secret, WhatsApp access token/app secret, or image-provider key to client code or public logs. The frontend must not import backend modules or connect directly to the database.
- Do not accept untrusted storage keys/URLs as authority. Verify the logged-in user may manage the referenced product and media asset.
- Validate media type by content as well as extension/MIME, constrain dimensions/size, and store under server-generated keys.
- Add rate limits/cost caps to login, media upload, and AI generation. Use idempotency to prevent accidental duplicate generation charges.
- Sanitize rich text if rich text is supported. Avoid raw HTML rendering of product description.
- Use safe error responses; details go to structured server logs with correlation IDs.
- Keep migrations, seed scripts, backup/restore instructions, and a production secret-rotation path documented.

## 7. Git and delivery discipline

- Work on a feature branch when repository conventions allow.
- Before modifying a file, inspect existing content and Git diff. Preserve unrelated local changes.
- Make focused commits with messages that describe behavior, for example `feat(products): add admin draft editor`.
- Do not force-push, rewrite history, or delete remote branches without explicit authorization.
- Do not deploy, purchase a provider plan, create a production database, or modify live credentials without the appropriate access/authorization.
- Keep generated build outputs and `.env` files out of Git.
- Update README/docs when setup, environment, commands, or provider requirements change.

## 8. Final report format after each work session

Report in this order:

1. **Completed:** concrete pages/components/data flows implemented.
2. **Verification:** exact commands/tests run and pass/fail status.
3. **Observed result:** what was visually/behaviorally checked, and at which viewport/browser if applicable.
4. **Integration state:** mock vs real database/auth/media/AI provider; list missing credentials honestly.
5. **Known issues:** reproducible issues, not vague warnings.
6. **Next implementation step:** one highest-priority continuation item, then proceed when the environment and task permit—do not ask for permission for routine engineering work.

## 9. Definition of done

The task is not complete merely because files compile or screenshots look convincing. It is complete when the requested pages/components exist, data flows through the intended services, administrator actions are authorized and validated, media and animation lifecycles are safe, critical tests pass, and the observed frontend matches `design.md` at desktop and mobile sizes.
