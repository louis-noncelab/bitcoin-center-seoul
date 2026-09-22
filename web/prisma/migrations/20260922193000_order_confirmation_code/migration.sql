ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmationCode" TEXT;
UPDATE "Order" SET "confirmationCode" = substr(md5("id" || random()::text || clock_timestamp()::text), 1, 24) WHERE "confirmationCode" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_confirmationCode_key" ON "Order"("confirmationCode");
