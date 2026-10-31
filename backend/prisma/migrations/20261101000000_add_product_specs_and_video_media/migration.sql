CREATE TYPE "ProductMediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "products"
ADD COLUMN "fabricSpecifications" JSONB;

ALTER TABLE "product_media"
ADD COLUMN "mediaType" "ProductMediaType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN "caption" TEXT,
ADD COLUMN "posterUrl" TEXT;
