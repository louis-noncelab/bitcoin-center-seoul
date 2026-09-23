ALTER TABLE "EmailOutbox" ADD COLUMN "orderId" TEXT;
CREATE INDEX "EmailOutbox_orderId_idx" ON "EmailOutbox"("orderId");
UPDATE "EmailOutbox" e SET "orderId" = o.id FROM "Order" o
WHERE e."eventKey" LIKE 'order:' || o.id || ':%' OR e."eventKey" LIKE 'operator:' || o.id || ':%';
