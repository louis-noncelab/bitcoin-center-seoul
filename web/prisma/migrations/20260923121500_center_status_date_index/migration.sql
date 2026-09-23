CREATE INDEX "center_events_center_status_date_idx"
ON "center_events" (BTRIM(REPLACE("date", '.', '-')))
WHERE "venueType" = 'center';
