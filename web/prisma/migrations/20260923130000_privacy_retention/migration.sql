ALTER TABLE "Order" ADD COLUMN "privacyRedactedAt" TIMESTAMP(3), ADD COLUMN "privacyHold" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Order_privacyRedactedAt_createdAt_idx" ON "Order"("privacyRedactedAt", "createdAt");
CREATE TABLE "PrivacyLegalRecord" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivacyLegalRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivacyLegalRecord_kind_check" CHECK ("kind" IN ('TRANSACTION', 'DISPUTE', 'ADVERTISEMENT'))
);
CREATE UNIQUE INDEX "PrivacyLegalRecord_orderId_kind_key" ON "PrivacyLegalRecord"("orderId", "kind");
CREATE INDEX "PrivacyLegalRecord_expiresAt_idx" ON "PrivacyLegalRecord"("expiresAt");
