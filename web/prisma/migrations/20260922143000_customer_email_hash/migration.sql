ALTER TABLE "Order" ADD COLUMN "customerEmailHash" TEXT;
CREATE INDEX "Order_customerEmailHash_idx" ON "Order"("customerEmailHash");
