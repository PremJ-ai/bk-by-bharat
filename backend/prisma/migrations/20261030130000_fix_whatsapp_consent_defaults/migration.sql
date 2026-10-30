-- Align database defaults with explicit transactional WhatsApp opt-in.
-- Do not rewrite historical consent records; existing rows may contain an explicit
-- checkout choice and must be reviewed separately before any data correction.
ALTER TABLE "orders"
  ALTER COLUMN "whatsappConsent" SET DEFAULT false,
  ALTER COLUMN "whatsappConsentAt" DROP NOT NULL,
  ALTER COLUMN "whatsappConsentAt" DROP DEFAULT;
