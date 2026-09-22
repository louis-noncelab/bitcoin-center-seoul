ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT NOT NULL DEFAULT 'hello@noncelab.com';
