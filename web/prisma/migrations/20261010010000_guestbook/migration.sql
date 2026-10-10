CREATE TABLE "guestbook_entries" (
    "id" SERIAL NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "visit_date" TEXT NOT NULL,
    "visitor_name" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "body_en" TEXT NOT NULL DEFAULT '',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guestbook_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "guestbook_entries_is_active_visit_date_id_idx" ON "guestbook_entries"("is_active", "visit_date" DESC, "id" DESC);
