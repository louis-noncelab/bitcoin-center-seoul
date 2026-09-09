# Events-only owner-system review — PRE-SLUG

**Status:** source-only preflight; not a final visual verdict.

The owner changed scope to admin-defined public slugs while the prior screenshot
set was being generated. No `source-freeze.json` existed when this review ended,
and the forthcoming slug implementation will change routes and evidence. Per that
direction, I did not inspect the old or in-progress captures and do not issue a
PASS/REVISE verdict for the pre-slug build.

## Evidence inspected

- `web/src/components/site/home.tsx`
- `web/src/components/site/events-public.tsx`
- `web/src/app/[locale]/[section]/page.tsx`
- `web/src/app/[locale]/journal/[id]/page.tsx`
- `web/src/app/[locale]/programs/[id]/page.tsx`
- `web/src/components/site/site-header.tsx`
- `web/src/components/site/site-footer.tsx`
- `web/src/components/events-admin/{events-admin,record-editor,editor-fields,gallery-field}.tsx`
- `web/src/server/events/index.ts`
- `web/src/styles/{tokens,primitives,events-public,footer,navigation,controls,events-admin}.css`
- `web/DESIGN.md` current events-only contract

The evidence directory `docs/checkpoints/evidence/events-only/owner-final-pass/`
contained 196 PNG files by the end of this pass, but they are intentionally not
review evidence: the requested slug work has not been source-frozen or recaptured.

## Source integrity observations

- The public surface is live React/Next markup. Home cards are real `article`,
  link, and `next/image` nodes; detail galleries map real image records to image
  nodes. No screenshot or CSS `background-image` substitutes for public content
  were found.
- Color, type, spacing, geometry, motion, focus, and layer values are centrally
  declared in `web/src/styles/tokens.css`; public CSS consumes those variables.
  The few admin literal border and text values are limited exceptions, rather than
  a second visual system.
- Home receives `listHighlights()` in descending end/start/date order
  (`web/src/server/events/index.ts:77-82`) and `HighlightsCatalog` limits its
  preview to three records (`web/src/components/site/events-public.tsx:103-105`).
  The cards have a live first-photo frame (`:112-116`).
- The highlight route renders H1, gallery, category/date/host metadata, then body
  (`web/src/app/[locale]/journal/[id]/page.tsx:44-50` and
  `web/src/components/site/events-public.tsx:138-147`). It has neither a Photos
  heading nor a generic trailing metadata label.
- The footer uses direct mail/tel anchors, the requested X and Instagram URLs,
  and an icon-only back-to-top control (`web/src/components/site/site-footer.tsx:44-73`).
  The old marquee is not rendered. Navigation and footer states use color only,
  with no underline or blue selected fill; the shared visible keyboard outline
  remains in `web/src/styles/primitives.css:73-76`.
- `/en/admin` deliberately renders Korean management content (`web/src/app/[locale]/admin/page.tsx:13-16`).
  Its real image field supports ordered multi-upload, up to twelve images
  (`web/src/components/events-admin/gallery-field.tsx:19-51`).

## Findings

### CRITICAL

None found in this source-only pass.

### HIGH

- **[product] Program-list rows render a full duplicate gallery, and do so inside
  invalid inline markup.** `EventGroup` already renders the first image as the
  event-row cover at `web/src/components/site/events-public.tsx:85-86`, then
  calls `PhotoGallery` at line 88 inside `span.event-card-copy`. `PhotoGallery`
  returns block `div` elements and maps every image at lines 151-162. The
  stylesheet makes this child visible (`web/src/styles/events-public.css:37-45`,
  `77-80`) and supplies no suppression rule. An event with multiple uploads will
  therefore show its cover plus a complete full-size gallery inside the compact
  program row, severely breaking the list layout at every viewport. This also
  places block content inside a `span`, making the DOM invalid and vulnerable to
  browser reparsing/hydration mismatch.

### MEDIUM

None. The owner explicitly confirmed that the reading-width, one-column,
original-ratio detail gallery is the current requirement; it supersedes the
older one/two-column language retained in `DESIGN.md`.

### LOW

- **[product] A few admin rules bypass existing tokens.**
  `web/src/styles/events-admin.css:2,6,9,18,22,24,29` repeats literal `1px`,
  `3px`, and `1rem` values despite `--border-width`, `--text-small`, and the
  spacing scale in `tokens.css`. This does not make the interface ad hoc, but
  using the shared roles would keep the admin surface more resilient to future
  token changes.

## Blockers for a final approval

1. Remove the list-row `PhotoGallery` duplication and preserve one cover image per
   program row.
2. Complete slug work, then produce a new source freeze and fresh complete capture
   matrix before a rendered final review.
