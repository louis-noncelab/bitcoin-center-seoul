-- Center content previously stored in SQLite.

CREATE TABLE "center_events" (
  "id" SERIAL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "registrationClosed" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "venueType" TEXT NOT NULL DEFAULT 'external',
  "location" TEXT NOT NULL,
  "locationEn" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "image" TEXT NOT NULL DEFAULT '',
  "link" TEXT NOT NULL DEFAULT '',
  "ticketPriceKrw" TEXT NOT NULL DEFAULT '',
  "ticketCapacity" INTEGER NOT NULL DEFAULT 0,
  "externalPayment" BOOLEAN NOT NULL DEFAULT true,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "onlineUrl" TEXT NOT NULL DEFAULT '',
  "onlineInstructions" TEXT NOT NULL DEFAULT '',
  "onlineInstructionsEn" TEXT NOT NULL DEFAULT '',
  "tags" TEXT NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "center_highlights" (
  "id" SERIAL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "meta" TEXT NOT NULL DEFAULT '',
  "metaEn" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT '행사',
  "categoryEn" TEXT NOT NULL DEFAULT 'Event',
  "date" TEXT NOT NULL DEFAULT '',
  "startDate" TEXT NOT NULL DEFAULT '',
  "endDate" TEXT NOT NULL DEFAULT '',
  "host" TEXT NOT NULL DEFAULT '비트코인 센터 서울',
  "hostEn" TEXT NOT NULL DEFAULT 'Bitcoin Center Seoul',
  "description" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL,
  "image" TEXT NOT NULL DEFAULT '',
  "link" TEXT NOT NULL DEFAULT '',
  "icon" TEXT NOT NULL DEFAULT 'calendar',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "content_images" (
  "kind" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "path" TEXT NOT NULL,
  PRIMARY KEY ("kind", "content_id", "position")
);

CREATE TABLE "content_slugs" (
  "kind" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "is_current" BOOLEAN NOT NULL,
  PRIMARY KEY ("kind", "slug")
);
CREATE UNIQUE INDEX "content_slugs_current" ON "content_slugs" ("kind", "content_id") WHERE "is_current";

CREATE TABLE "notices" (
  "id" SERIAL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL,
  "descriptionEn" TEXT NOT NULL DEFAULT '',
  "is_active" INTEGER NOT NULL DEFAULT 0,
  "tags" TEXT NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "notices_slug_key" ON "notices"("slug");

CREATE TABLE "notice_slugs" (
  "slug" TEXT PRIMARY KEY,
  "notice_id" INTEGER NOT NULL
);

CREATE TABLE "collection_items" (
  "id" SERIAL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "kind" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT '',
  "purchaseUrl" TEXT NOT NULL DEFAULT '',
  "soldOut" BOOLEAN NOT NULL DEFAULT false,
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL DEFAULT '',
  "creator" TEXT NOT NULL DEFAULT '',
  "creatorEn" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "descriptionEn" TEXT NOT NULL DEFAULT '',
  "images" TEXT NOT NULL DEFAULT '[]',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "visit_reviews" (
  "id" SERIAL PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "kind" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "date" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL,
  "summaryEn" TEXT NOT NULL DEFAULT '',
  "slug" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "descriptionEn" TEXT NOT NULL DEFAULT '',
  "feature_title" TEXT NOT NULL DEFAULT '',
  "feature_titleEn" TEXT NOT NULL DEFAULT '',
  "image" TEXT NOT NULL DEFAULT '',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "review_slugs" (
  "slug" TEXT PRIMARY KEY,
  "review_id" INTEGER NOT NULL
);

CREATE TABLE "review_selection" (
  "id" INTEGER PRIMARY KEY,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "featured_id" INTEGER,
  "home_ids" TEXT NOT NULL DEFAULT '[]'
);

INSERT INTO "review_selection" ("id", "revision", "featured_id", "home_ids") VALUES (1, 1, NULL, '[]');

CREATE TABLE "center_opening_overrides" (
  "date" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL
);

CREATE TABLE "admin_sessions" (
  "token_hash" TEXT PRIMARY KEY,
  "expires_at" BIGINT NOT NULL,
  "last_seen_at" BIGINT NOT NULL DEFAULT 0,
  "credential_version" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE "admin_login_attempts" (
  "client_hash" TEXT PRIMARY KEY,
  "window_started" BIGINT NOT NULL,
  "failures" INTEGER NOT NULL,
  "blocked_until" BIGINT NOT NULL
);
