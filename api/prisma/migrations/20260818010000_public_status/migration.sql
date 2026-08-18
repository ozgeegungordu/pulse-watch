-- Add public status page fields
ALTER TABLE "Monitor" ADD COLUMN "publicEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Monitor" ADD COLUMN "publicSlug" TEXT;
CREATE UNIQUE INDEX "Monitor_publicSlug_key" ON "Monitor"("publicSlug");
