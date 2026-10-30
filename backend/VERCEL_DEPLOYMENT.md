# Bharat Atelier Backend — Vercel Deployment

## Vercel project

Create a second Vercel project from the same GitHub repository:

- Repository: PremJ-ai/bk-by-bharat
- Project name: bharat-atelier-api
- Root Directory: backend
- Framework preset: Express / Other (leave detection defaults when Express is detected)
- Build Command: npm run vercel-build
- Output Directory: leave empty/default
- Install Command: use the monorepo default so the root npm lockfile/workspaces are respected

The serverless app entry point is src/index.ts and default-exports the Express application. src/server.ts remains the local server entry point.

After the first deployment, verify:

- https://<backend-domain>/health/live
- https://<backend-domain>/health/ready

The ready endpoint requires PostgreSQL connectivity.

## Backend Vercel environment variables

Set these in the backend Vercel project (Production and Preview only as appropriate):

- NODE_ENV=production
- DATABASE_URL: Supabase PostgreSQL Session Pooler connection string for the production database
- SESSION_SECRET: a random secret with at least 32 characters
- FRONTEND_ORIGIN: exact production frontend origin, including https, with no trailing slash
- TRUST_PROXY=true
- SUPABASE_URL: Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: service-role secret; backend only, never a NEXT_PUBLIC_ variable
- PAYMENT_PROOFS_BUCKET=payment-proofs

Add Meta WhatsApp variables only after the WhatsApp Business Cloud API is configured:

- META_WHATSAPP_TOKEN
- META_WHATSAPP_PHONE_ID
- WHATSAPP_APP_SECRET
- WHATSAPP_VERIFY_TOKEN

Do not set PORT for Vercel. It is used by the local Express server only.

## Supabase Storage setup for payment proofs

In Supabase Dashboard → Storage → New bucket:

- Name: payment-proofs
- Visibility: Private
- Maximum file size: 10 MB
- Allowed MIME types: image/jpeg, image/png, image/webp

The application creates short-lived signed upload URLs and uploads the image directly from the customer’s browser to this private bucket. The service-role key is used only inside the backend. Proof retrieval is authorized by the customer’s opaque order token or a valid admin session and redirects to a short-lived signed download URL.

Do not make this bucket public.

## Frontend connection

In the existing frontend Vercel project, set:

- API_BASE_URL=https://<backend-domain>/api/v1

Redeploy the frontend after setting it. The frontend's Next.js rewrite forwards browser /api/v1/* requests to the backend.

## Database and first admin

Before testing production order flows:

1. From the project root, ensure the local backend/.env points to the production Supabase Session Pooler. Do not commit that file.
2. Run npm run prisma:deploy --workspace=backend to apply pending migrations only.
3. Run npm run admin:bootstrap --workspace=backend once to create the first admin. Enter the password at the interactive prompt; do not place it in command history.
4. Log into /admin and open Payment Settings.
5. Replace all placeholder values with the genuine business UPI ID, beneficiary name, support WhatsApp number, and payment instructions.

Do not run integration tests or destructive seed scripts against the production database.

## Ordering and admin acceptance test

Use a small test product/variant with controlled stock:

1. Customer adds the product and selects a valid size.
2. Customer checks out as a guest and explicitly opts in to transactional WhatsApp messages.
3. Confirm one order appears in Admin → Orders with status AWAITING_ADMIN_REVIEW.
4. Admin confirms availability and issues the final invoice; stock reservation is created.
5. Customer opens the original private order-confirmation link and sees the UPI QR and invoice.
6. Customer uploads a JPEG/PNG/WebP proof directly to private storage and submits UTR.
7. Confirm the order changes to PAYMENT_PROOF_RECEIVED.
8. Admin checks actual bank settlement independently, then enters the UTR and marks paid.
9. Confirm stock is decremented once and order becomes PAID.
10. Admin adds carrier/tracking information and dispatches; order becomes SHIPPED.
11. Verify customer order status can be read with the private guest token.
12. Exercise cancellation/refund only with a deliberate test transaction and record the actual manual refund reference.

WhatsApp messages are only delivered externally when the live Meta provider is configured. The local adapter only records message events in PostgreSQL.
