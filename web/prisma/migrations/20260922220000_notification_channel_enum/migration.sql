-- CreateEnum (idempotent: the lightning_addresses migration stored this column as TEXT)
DO $$
BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('DISCORD', 'MATTERMOST', 'GENERIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "SiteSetting" ALTER COLUMN "notificationChannel" DROP DEFAULT;
ALTER TABLE "SiteSetting" ALTER COLUMN "notificationChannel" TYPE "NotificationChannel" USING "notificationChannel"::"NotificationChannel";
ALTER TABLE "SiteSetting" ALTER COLUMN "notificationChannel" SET DEFAULT 'GENERIC';
