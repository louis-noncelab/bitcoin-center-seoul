# src/components

Score 12 (64 files incl. `ui/`, 100% code, ~50 `ui/` import sites) - distinct domain: the landing page's sections/modals plus the generated shadcn `ui/` set.

## OVERVIEW
16 hand-written section/modal/form components composed by `src/pages/Index.tsx`, `ServicesSection`, and the Admin pages; `ui/` is 49 shadcn primitives (style `default`, baseColor `slate`, cssVariables) that have never been customized.

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Hero video, address, hours | `HeroSection.tsx` | video from S3 `bitcoin-center-seoul.s3.ap-northeast-2`; opens `EventScheduleModal` |
| Upcoming events list | `ActivitiesSection.tsx` | `id="events"`; GET `/api/events/upcoming`; `image || '/images/main1.png'` |
| Past highlights grid | `EventHighlightsSection.tsx` | `id="highlights"`; GET `/api/highlights` (active rows only) |
| Programs + course/meetup dialogs | `ServicesSection.tsx` -> `EducationCoursesModal.tsx`, `MeetupsModal.tsx` | `id="services"` (nav label says "Activities") |
| Community links | `CommunitySection.tsx` | `id="community"` |
| Header + language toggle | `Navigation.tsx` | `menuItems` and `sections` arrays are index-paired; keep them in sync |
| Footer | `Footer.tsx` | shares `Logo.tsx` with Navigation |
| First-visit event popup | `EventScheduleModal.tsx` | suppressed for the day via `localStorage.dontShowEventModalToday` |
| Admin date input | `DatePicker.tsx` | only `pages/AdminEvents.tsx` uses it |
| Admin image upload | `ImageUploadField.tsx` | file picker + drag-drop, uploads on select via `lib/admin.ts` `uploadImage()`; both Admin pages. Takes props, unlike sections |
| Contact FAB | `FloatingContactButton.tsx` | mounted by `Index.tsx` only |
| Unmounted sections | `AboutSection.tsx` (`#about`), `PricingSection.tsx` (`#price`) | exported, imported nowhere; not on the page |

## CONVENTIONS
- Component skeleton: `const X = () => { const { language } = useLanguage(); const content = { ko: {...}, en: {...} }; ... content[language].field ... }; export default X;` - one default export, no named exports, sections take no props.
- Section root is `<section id="...">` with `container mx-auto px-6`; an `id` is only reachable from the menu if it is in `Navigation.tsx` `sections`.
- Modals take `{ open, onOpenChange }` (shadcn `Dialog`) with state owned by the parent; course/meetup modals nest their own `EventScheduleModal`.
- API sections map DB rows to view models inside the component (`titleEn` etc. picked by `language`) with `useState` + `useEffect`; there is no shared fetch helper.
- Icons: `lucide-react` only.
- `ui/`: add primitives with `npx shadcn@latest add <name>` (aliases in `components.json`).

## ANTI-PATTERNS
- Don't hand-edit `ui/*`; nothing there is project-specific and a regenerate would clobber it.
- Don't import `@/components/ui/use-toast`; import `@/hooks/use-toast` (the ui file is a shim).
- Don't extend the English-only tags in `EducationCoursesModal.tsx:119-126` or the hardcoded Korean loading text in `EventScheduleModal.tsx:154`; they are existing inconsistencies, not a pattern.
- Don't add a fourth place that lists section ids: `Navigation.tsx` `sections`, `Index.tsx` order, and each `id=` are already three.
- Don't reach for `ui/sidebar`, `ui/chart`, `ui/carousel`, `ui/command`, `ui/menubar` expecting project wiring; they are unused.
