BEGIN;

ALTER TABLE "guestbook_entries"
    ADD COLUMN "entry_number" INTEGER,
    ADD COLUMN "volume" INTEGER NOT NULL DEFAULT 1,
    ALTER COLUMN "visit_date" SET DEFAULT '';

UPDATE "guestbook_entries" SET "entry_number" = "id";

ALTER TABLE "guestbook_entries"
    ALTER COLUMN "entry_number" SET NOT NULL,
    ADD CONSTRAINT "guestbook_entries_entry_number_positive" CHECK ("entry_number" > 0),
    ADD CONSTRAINT "guestbook_entries_volume_positive" CHECK ("volume" > 0);

CREATE UNIQUE INDEX "guestbook_entries_entry_number_key" ON "guestbook_entries"("entry_number");
CREATE INDEX "guestbook_entries_is_active_entry_number_idx" ON "guestbook_entries"("is_active", "entry_number" DESC);
DROP INDEX "guestbook_entries_is_active_visit_date_id_idx";

COMMIT;
