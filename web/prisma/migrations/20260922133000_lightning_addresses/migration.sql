CREATE TABLE "LightningAddress" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "allowedOrigins" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LightningAddress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LightningAddress_address_key" ON "LightningAddress"("address");
ALTER TABLE "SiteSetting" ADD COLUMN "lightningAddressId" TEXT;
ALTER TABLE "SiteSetting" ADD COLUMN "notificationChannel" TEXT NOT NULL DEFAULT 'GENERIC';
ALTER TABLE "SiteSetting" ADD COLUMN "notificationWebhook" TEXT;
CREATE UNIQUE INDEX "SiteSetting_lightningAddressId_key" ON "SiteSetting"("lightningAddressId");
ALTER TABLE "SiteSetting" ADD CONSTRAINT "SiteSetting_lightningAddressId_fkey" FOREIGN KEY ("lightningAddressId") REFERENCES "LightningAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
