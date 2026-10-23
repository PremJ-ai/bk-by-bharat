# Design System & Frontend Experience — Fashion Commerce

**Status:** Approved implementation brief  
**Priority:** This document is the source of truth for the visual language, customer-facing pages, component behavior, and animation rules.  
**Reference:** The uploaded Stitch showcase (`stitch_interactive_fashion_e_commerce_showcase.zip`) supplies the editorial menswear mood: cinematic hero, split editorial panels, a restrained moving ticker, curated product cards, material/craft storytelling, and generous whitespace. Reuse the visual principles, not another brand's logo, text, or proprietary assets.

## 1. Product vision

Create a premium, editorial fashion store where imagery sells the product and the UI makes choosing a size, understanding the material, and checking availability easy. Motion should feel composed and tactile—not like a motion demo. A non-technical store administrator must be able to create a product, provide its core details, generate an initial AI product image, review that image, replace or supplement it with uploaded media, and publish the record. Once published, the same product record drives the product card, collection grid, search/filter results, and product detail page.

### Experience principles

1. **Editorial first, commerce clear.** Large photographs and considered type establish brand character; price, size, availability, and action labels remain easy to find.
2. **Image-led, never image-dependent.** Meaningful text, price, and purchase controls must remain available if a product image or video fails.
3. **One product truth.** Storefront cards are rendered from the product domain model; there are no hand-maintained copies of product details in page markup.
4. **Motion with purpose.** Scroll reveals, crop movement, image crossfades, and editorial video help orient the visitor. They must not delay browsing, hide content, or block actions.
5. **Admin is a working tool.** The admin experience prioritizes form clarity, robust validation, status visibility, safe media handling, and confirmation for destructive changes.
6. **Mobile is a complete experience.** The design must work with native touch scrolling, small screens, keyboard navigation, and reduced-motion settings.

## 2. Visual identity

### Color tokens

Use CSS custom properties as the single source of truth. Avoid scattering raw hex values through components.

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#FBF9F5` | Main warm parchment background |
| `--color-surface` | `#FFFFFF` | Cards, drawers, product details, forms |
| `--color-surface-muted` | `#F1EEE8` | Quiet bands, filter background, image fallback |
| `--color-ink` | `#202428` | Main body text and icons |
| `--color-navy` | `#0A192F` | Primary action, dark editorial band, footer |
| `--color-navy-strong` | `#061120` | Hero overlays and deep dark surfaces |
| `--color-gold` | `#C29B38` | Restrained premium accent, thin rules, decorative detail |
| `--color-rust` | `#8C3A27` | Seasonal collection marker or promotion only |
| `--color-muted` | `#4A525D` | Secondary text on light surfaces |
| `--color-border` | `#E5E2DC` | Hairline dividers and card outlines |
| `--color-stock-low` | `#BA1A1A` | Low-stock/error state with text/icon, never color alone |
| `--color-stock-ok` | `#1B5E20` | Available status with text/icon, never color alone |
| `--color-focus` | `#2458A6` | High-visibility keyboard focus ring |
| `--color-overlay` | `rgba(6, 17, 32, 0.58)` | Modal/video scrim |

**Color usage:** Keep gold as an accent, not the main text color on white. Use dark ink for long body copy. Use a dark-on-light or light-on-dark pairing with demonstrable contrast. Statuses must include readable labels and, where appropriate, icons; do not rely on red/green alone.

### Typography

- **Display / editorial:** `EB Garamond`, weight 400–500. Use for the hero headline, section titles, editorial stories, and product names where space allows.
- **UI / body / utility:** `Hanken Grotesk`, weights 400–700. Use for navigation, descriptions, price, filters, forms, stock, and administrative interfaces.
- **Fallbacks:** `Georgia, serif` for display; `Arial, Helvetica, sans-serif` for utility text.
- Load fonts through `next/font` where feasible so they are optimized and locally served by the application build.

| Style token | Desktop | Mobile | Notes |
|---|---|---|---|
| `display-xl` | 64/68 px | 40/46 px | Hero heading; regular weight; tight tracking |
| `display-lg` | 48/54 px | 34/40 px | Major campaign/collection titles |
| `heading-xl` | 38/46 px | 30/36 px | Major page sections |
| `heading-md` | 26/32 px | 23/29 px | Editorial panels and PDP sections |
| `heading-sm` | 20/26 px | 18/24 px | Product card name |
| `body-lg` | 17/27 px | 16/25 px | Lead / brand story |
| `body-md` | 14/22 px | 14/21 px | Default text |
| `body-sm` | 12/18 px | 12/18 px | Secondary metadata, never critical legal or purchase copy |
| `label-caps` | 10–11/14 px | 10–11/14 px | Uppercase, letter spacing 0.12–0.20em |
| `price` | 15–17/22 px | 14–16/21 px | Sans-serif; semibold, tabular numerals |

Use fluid typography (`clamp()`) for display headings. Do not set body copy below 12px. Use uppercase/tracked styling sparingly for labels, not paragraphs.

### Spacing, grid, and shapes

- Base spacing unit: 4px; standard rhythm increments: 8, 12, 16, 24, 32, 48, 64, 96px.
- Desktop at `min-width: 1200px`: 12-column grid, outer gutter 40–56px, 20–28px column gaps; product grid usually 4 columns, optionally 3 for larger photography.
- Tablet `768px–1199px`: 8 columns, outer gutter 28–32px; product grid 2–3 columns depending on card width.
- Mobile `<768px`: 4-column rhythm, 16px page gutter, 10–14px card gap; default product grid is 2 columns.
- Main content max width: 1440px, except full-bleed editorial/hero sections.
- Product image default aspect ratio: `4 / 5`; editorial story media may use `3 / 4`, `4 / 3`, or wide `16 / 9` according to art direction.
- Radius: 2–4px for image frames/buttons/forms; 999px only for size/color chips where pill shape communicates selection.
- Borders are thin and calm (`1px solid var(--color-border)`). Use shadows only for floating drawers/menus, never as a replacement for hierarchy.

### Surface depth

- Base cards sit flat on the canvas with a fine border or no border depending on section.
- Product card hover may use `0 8px 24px -4px rgba(10, 25, 47, 0.06)` and a 1–2px media/crop shift.
- Dialogs and drawers use a subtle ambient shadow and a clear scrim.
- Do not use excessive glassmorphism, large blurred shadows, gradients behind every card, or pill-shaped cards throughout the site.

## 3. Site map and layout

### Customer-facing routes

- `/` — Home / brand landing page.
- `/collections/[slug]` — Campaign or category landing page (for example shirts or trousers); reusable editorial header + product listing.
- `/products/[slug]` — Product detail page (PDP).
- `/search` — Search results and filters, when included in scope.
- `/cart` or a cart drawer — Cart entry point; checkout implementation can be integrated later without changing the product model.
- `/policies/shipping`, `/policies/returns`, `/policies/privacy` — Real policy content, not placeholder anchors, before launch.

### Home page sequence

1. **Announcement strip:** One useful service/campaign message; optional close control; keyboard accessible.
2. **Site header:** Brand mark, primary category links, search, account (if present), and bag/cart. Header should be compact and readable over both light and dark hero states. On desktop it can become subtly opaque after the hero.
3. **Hero / brand landing:** Full-bleed still or muted loop video with poster image, editorial headline, one short supporting line, and two clear calls to action (e.g. “Explore Shirts” and “Explore Trousers”). Provide a visible pause/play control if motion is ongoing. Ensure sufficient overlay contrast.
4. **Editorial split feature:** Large lifestyle image beside smaller craft/product panels; alternate layout direction on later sections. Each panel has a clear destination and concise content.
5. **Material / new-arrival ticker:** A continuous, quiet horizontal strip that pauses on hover and keyboard focus; respect reduced motion; on touch allow normal scrolling instead of a constant marquee.
6. **Featured products:** Reusable `ProductGrid` backed by the same product query as the collection page; admin changes should flow here automatically.
7. **Collection story / film:** Wide campaign frame with short text and a play-to-watch affordance. Video loads only when near viewport or explicitly requested.
8. **Craft / service proof points:** Materials, delivery, tailoring, care, or return promises—only claims supported by the business.
9. **Newsletter / appointment module:** Include only if functional and connected to a real endpoint.
10. **Footer:** Shop links, customer care, real policy pages, social destinations, currency/locale only if genuinely supported, and business/copyright details supplied by the owner.

### Collection / category landing page

1. Breadcrumbs.
2. Editorial masthead with category title, short introduction, and optional image/video.
3. Result count plus sort control.
4. Filter bar for category-relevant facets: size, material, color, availability, and price where data exists. Mobile filters open in a labeled bottom sheet/drawer with Apply and Clear actions.
5. Product grid with stable image ratios and reserved space for metadata to avoid layout shift.
6. Empty-results state with clear reset control; loading skeleton; recoverable error state.
7. Optional lower editorial panel and related collection links.

Filters and sorting must work against actual product data. Hide a facet if the source has no values for it. No non-functional controls that only look interactive.

### Product detail page

- Desktop: split layout; media gallery on the left (or primary column), purchase summary and size/availability controls on the right. Keep information hierarchy clear without locking essential purchase content behind scroll effects.
- Mobile: gallery first, product name/price immediately after; size and availability before the primary action. A sticky add-to-bag bar is optional, but must not cover browser UI, focus targets, or the page footer.
- Display: name, price, compare-at price only if valid, material, description, SKU only if helpful, available sizes, color variants, stock/availability, care notes, shipping/returns, and image gallery.
- Size selection is required when size variants exist. Disabled sizes must expose an accessible unavailable label. The primary action reflects selection/stock state.
- Gallery supports thumbnail navigation, keyboard controls, zoom as an explicit action, and a still-image fallback if video fails.

## 4. Shared component architecture

Build small, composable components with typed props. Pages arrange components; they should not duplicate markup or animation setup.

### App shell and layout

- `StorefrontLayout`: store header, announcement strip, footer, content wrapper, global overlay layer.
- `SiteHeader`, `AnnouncementBar`, `MobileNav`, `SearchDialog`, `CartDrawer`, `SiteFooter`, `Breadcrumbs`.
- `PageContainer`, `SectionHeading`, `EditorialSplit`, `CampaignHero`, `MarqueeTicker`, `ServiceHighlights`, `NewsletterForm`.
- `CollectionHeader`, `ProductToolbar`, `ProductFilters`, `SortSelect`, `ProductGrid`, `EmptyState`, `LoadingState`, `ErrorState`.
- `AdminLayout` is visually separate from the storefront and does not run ScrollSmoother or editorial entrance animations.

### Product and media components

- `ProductCard`: generic presentation for a product summary; all displayed values come from a typed product record.
- `ProductGrid`: maps product records to `ProductCard`, uses stable product IDs/keys and preserves grid skeleton dimensions.
- `ProductMedia`: selects image/video presentation based on a media record and provides accessible fallbacks.
- `ProductGallery`: PDP gallery, thumbnails, selected media, zoom, and optional video playback.
- `ResponsiveImage`: reserves width/height or aspect ratio, uses the framework image component where applicable, and handles alt text/loading/error fallback.
- `EditorialVideo`: poster first; muted autoplay only when appropriate and in-view; controls remain available; defer video source until needed.
- `MediaPlaceholder`: neutral texture/color with product initials or an icon when media is missing; never use a broken-image icon.
- `Price`, `StockBadge`, `SizeSelector`, `ColorSwatches`, `ProductQuickView` (only if fully functional), `AddToCartButton`.

### Product card contract

The storefront and the admin product preview must use the same base `ProductCard` and the same display formatters. Do not create a second card implementation with separate price/stock logic.

**Required props:** `product`, optional `priority`, optional `variant` (`default | compact | featured`), and optional analytics callback. The product is fetched/assembled by its page or data layer; the card never fetches its own product independently.

**Content order:**
1. 4:5 media frame with image, hover alternate image or muted preview where available.
2. Optional restrained label (New, Limited, Sale) only when supported by actual record data.
3. Product name, typically no more than two lines visually; keep the full accessible name.
4. Material/fabric or short descriptor.
5. Price; compare-at price and discount only when valid.
6. Availability or color count only when meaningful and supplied.

**Interactions:**
- Pointer hover/focus: crossfade to alternate image if one exists; otherwise subtle crop/scale up to 1.025 over 450–650ms.
- Hover video only on capable pointer devices and only when a usable poster/video exists. Video must be muted, `playsInline`, short, and cleaned up on leave; never autoplay audio.
- Touch users should not have to hover to discover essential information.
- Card link opens the product detail page. Any Quick View button has its own accessible name and must not be nested inside the product link.
- Keyboard focus uses a visible focus ring. The card cannot rely on color or motion alone to signal interactivity.
- No card animation should change grid geometry or move other cards around.

## 5. Admin design and product publishing journey

### Admin information architecture

- `/admin/login` — authenticated sign-in.
- `/admin` — overview: product counts by state, recent changes, and useful inventory warnings; avoid fabricated analytics before events exist.
- `/admin/products` — searchable/filterable table with status, image thumbnail, name, SKU, price, availability, updated date, and actions.
- `/admin/products/new` — create form.
- `/admin/products/[id]/edit` — edit an existing product.
- Optional `/admin/media` — media library once asset reuse/search is implemented.

Use a calm, compact admin layout: neutral surfaces, strong labels, persistent save/publish state, useful empty/error states, and a consistent form grid. The admin should not inherit parallax, pinned panels, or animated product grids. Limit feedback animations to short state transitions.

### Create-product flow (AI-first media)

1. **Details:** Admin enters product name, slug (suggest automatically but editable), SKU, category, short/long description, sizes/variants, material, price, stock quantity/availability, and status intent.
2. **Validate:** Show inline field errors; server validation is authoritative. A product can be saved as draft without all publish-required fields.
3. **Generate first image:** Use saved product details to construct a controlled image prompt. Generate an image appropriate to garment type, fabric, color, intended crop/aspect ratio, and studio/editorial style. Generation is a server-side job; secrets never reach the browser.
4. **Review:** Show the generated image with `AI-generated · Draft` provenance, generation status, and actions: **Use image**, **Regenerate**, **Upload image instead**, and **Add another image**. The generation prompt should be visible/editable only where useful; keep technical provider errors out of public view.
5. **Replace/add media:** Uploaded assets become media records. Admin can select primary image, reorder gallery items, edit alt text, and remove items with confirmation. Replacing an image must not mutate another product's asset.
6. **Preview:** Render the real `ProductCard` with the current draft record plus a safe PDP preview. Clearly mark draft preview as unpublished.
7. **Save draft / Publish:** Save changes and require publish-critical fields/media validation. Publish makes the record available to public queries; draft/archived records never appear in the public storefront.
8. **Verify:** Show a saved/published confirmation and links to the edit screen and public product page where applicable.

AI generation failures must not lose entered details. Keep the product as a draft and provide retry, upload, and remove-image paths. A placeholder can support local development, but production publishing should require a real approved primary image unless the business explicitly configures another policy.

### Product form fields and rules

| Field | Type / rule | Required to publish |
|---|---|---|
| Name | Trimmed string, sensible max length | Yes |
| Slug | URL-safe unique string | Yes |
| SKU | Unique identifier; define case normalization | Depends on business; recommended yes |
| Category | Selected from controlled categories | Yes |
| Description | Plain text or sanitized rich text | Yes |
| Material | String or structured fabric composition | Recommended |
| Price | Integer minor units (e.g. paise), non-negative; formatted on UI | Yes |
| Sizes/variants | Structured choices, each with availability/stock | If product is sized |
| Stock | Non-negative integer per SKU/variant where applicable | Yes for stock-managed products |
| Availability | Derived from stock for inventory-managed products; override only if explicitly modeled | Yes/derived |
| Primary image | Approved image media record | Yes |
| Gallery | Ordered image/video media records | Optional |
| Media provenance | `ai_generated`, `uploaded`, or `external_migrated` | Yes for each asset |
| Status | `draft`, `published`, `archived` | Yes |

Never accept price, inventory, publication status, or media ownership solely from client-side state without server-side validation and authorization.

## 6. GSAP motion system

GSAP should provide a small set of reusable motion patterns. Use `@gsap/react` and the `useGSAP()` hook for React lifecycle cleanup, register `ScrollTrigger` once, and register `ScrollSmoother` only when the chosen build includes it. Animations must live in isolated hooks/components, not scattered anonymous effects throughout pages.

### Motion tokens

| Token | Duration | Typical use | Ease |
|---|---:|---|---|
| `motion-fast` | 0.18–0.25s | Button/icon feedback | `power2.out` |
| `motion-ui` | 0.25–0.35s | Menu, filter drawer, image crossfade | `power2.out` |
| `motion-reveal` | 0.65–0.85s | Headline/section reveal | `power3.out` |
| `motion-editorial` | 0.9–1.2s | Hero image, wide campaign text | `power3.out` |
| `motion-loop` | 24–36s per loop | Brand ticker, if enabled | `none` / linear |

Avoid exaggerated bounce, spring overshoot on luxury content, repeated large blur filters, and animations that routinely exceed 1.2 seconds except for deliberate continuous media.

### Global scroll smoother

- Storefront only; do not add smooth scrolling to admin, login, modal-only workflows, or checkout-critical forms.
- Initialize once at the storefront shell after the client layout mounts. Use the intended `#smooth-wrapper` and `#smooth-content` relationship; keep viewport-fixed dialogs/header layers outside transformed content when they must remain fixed to the viewport.
- Register plugins before use. Create the smoother before dependent ScrollTriggers. Destroy it on unmount and avoid multiple singleton instances during route transitions.
- Start with restrained values: `smooth: 0.7–1.0`, `effects: true`; leave touch scrolling native by default (`smoothTouch: false` or equivalent default). Tune only after testing with a real device.
- On `prefers-reduced-motion: reduce`, do not create ScrollSmoother; use native scroll. Never remove the browser scrollbar to fake a smooth-scroll effect.
- Smooth scroll must remain compatible with browser back/forward, anchor links, keyboard focus auto-scroll, mobile address-bar resizing, and dialogs.

### ScrollTrigger patterns

| Pattern | Trigger behavior | Safe default |
|---|---|---|
| Section reveal | When section top enters ~82% viewport | `once: true`; opacity + y 24–32px |
| Product card entrance | Stagger visible cards as grid enters viewport | 0.04–0.08s stagger; y 18–24px; one-time reveal |
| Product image parallax | Gentle inner-image travel while frame remains stable | Clamp effect; max visual shift ~4–7% |
| Editorial image crop reveal | Clip/mask reveal on entry | 0.7–0.9s; no horizontal layout movement |
| Text line reveal | Headline moves up/fades into place | Use only on short editorial headings; readable without JS |
| Pinned campaign feature | Desktop-only storytelling panel | Keep brief; avoid if it harms touch scrolling or keyboard focus |
| Media play-on-view | Video can play when near viewport and allowed | Muted, pause offscreen; still poster fallback |

Recommended starts: `top 82%` for reveals, `top 75%` for lighter image details. Use `once: true` for entrance animations to prevent flicker when scrolling up/down unless repeat behavior is intentional. Keep scroll-dependent animation properties to `transform` and `opacity` where possible.

### Product cards and media triggers

- Card reveals are scoped to a single grid and cleaned up if the grid re-renders or unmounts.
- Do not animate all catalog records at once; use stagger only for items in/near the viewport.
- Hover effects should be CSS-first for simple transitions and GSAP for coordinated image/video effects.
- Video logic listens to pointer/focus/visibility state, pauses on leave/offscreen, and catches play promises. Never assume autoplay succeeded.
- After product images, fonts, filters, or dynamic product lists alter page geometry, refresh ScrollTrigger measurements at a controlled point rather than on every render.
- Never pin a card grid as a whole. Never let scroll progress control availability, price, form fields, cart actions, or other business logic.

### Lifecycles and implementation guardrails

- Use `useGSAP()` or `gsap.context()` scoped to the component root; cleanup every tween, timeline, ScrollTrigger, observer, and video listener.
- Use `gsap.matchMedia()` for responsive-only effects; kill desktop pinning and parallax at breakpoints where they no longer apply.
- Keep visible fallback states in the server-rendered HTML; GSAP enhancement must not be required to reveal page content.
- Call `ScrollTrigger.refresh()` after meaningful layout changes and media load, with debouncing if multiple assets finish together.
- Avoid a second smooth-scroll library if ScrollSmoother is active. If ScrollSmoother is unavailable in the selected GSAP build, the site must degrade to native scrolling without a blocker.

## 7. Image and video direction

### AI-generated product images

- The initial demo catalog should use newly generated product imagery matched to the product record, not copied competitor photography or hotlinked reference assets.
- Use consistent art direction: accurate garment silhouette, texture/material, seam and button details, natural cloth folds, neutral studio or understated editorial location, controlled lens perspective, and repeatable crop/lighting across related items.
- Generate an image for the **specific product**—shirt vs. trouser, fabric and color, fit, and intended presentation. Do not let the image prompt silently change item color or design to something that conflicts with product data.
- Generate a main product image first. Create additional angles or lifestyle frames only when useful. Save alt text and provenance metadata alongside each asset.
- AI imagery is illustrative and must be reviewed for visual defects before publishing. Avoid using generated images to imply exact fabric details, color accuracy, product dimensions, or construction that has not been verified.

### Media design rules

- Product imagery: 4:5, centered composition, consistent background, enough clearance for crop at mobile breakpoints.
- Editorial lifestyle: 3:4 or 16:9 according to the slot; preserve a readable text-safe area for overlays.
- Video: provide poster first; MP4/WebM source where useful; compressed and short; muted and `playsInline`; user-visible controls for intentional playback; subtitles/captions for meaningful speech.
- Every meaningful image must have useful alt text. Decorative images use empty alt. Videos require a description or transcript/captions when they convey information unavailable in nearby text.
- Use responsive sizes, modern formats where supported, `loading="lazy"` for offscreen media, and `priority`/equivalent only for the true hero/first product images.
- Reserve frame dimensions before media loads. Show skeleton or tasteful placeholder while remote assets load.
- Never rely on arbitrary external image URLs from public form fields as trusted media. External imports require an allowlisted migration process or safe server-side ingestion.

## 8. Responsive behavior

- **Desktop:** broad editorial canvas, 3–4 column catalog, hover image crossfade, restrained parallax, optional pinned campaign sequence.
- **Tablet:** 2–3 column grid according to card width; reduce parallax travel and avoid multi-panel elements becoming too dense.
- **Mobile:** 2-column card grid, 16px page gutter, no hover-only controls, native scroll, touch-friendly filter drawer, video not autoplayed just because a card becomes visible unless browser/user policy permits and performance is verified.
- Keep actions at least 44×44 CSS px where practical; ensure safe area spacing on notched devices.
- Validate at 360px, 390px, 768px, 1024px, 1280px, and 1440px viewport widths.

## 9. Accessibility, performance, and quality gates

- Meet WCAG 2.2 AA as the target: semantic landmarks, heading hierarchy, visible focus, keyboard-operable controls, labels/errors, accessible dialogs, sufficient contrast, and non-color status cues.
- Respect `prefers-reduced-motion`; provide pause controls for nonessential continuous motion and never flash content.
- Avoid layout shift using image dimensions/aspect-ratio and stable card metadata regions.
- Only preload hero-critical media. Lazy-load below-the-fold photography. Defer video bytes until near-view or user intent.
- Test keyboard navigation and screen reader names for header, filters, size selectors, cart, quick view, upload, image generation, and publish confirmation.
- Verify animations do not block links, clicks, form completion, browser scroll, or mobile touch.
- Run responsive QA, accessibility checks, browser console review, image-failure testing, reduced-motion testing, and production build before claiming completion.

## 10. Definition of done for frontend

- [ ] Home, collection landing, product listing, product card, PDP, and admin layouts follow these tokens and hierarchy.
- [ ] All product content is data-driven with one shared typed product model.
- [ ] Product cards update after an admin edit/publish without editing frontend source code.
- [ ] AI-generated image is the initial admin media path; upload, replace, regenerate, reorder, and primary selection work.
- [ ] GSAP motion is scoped, responsive, cleaned up, and reduced-motion aware.
- [ ] Images have dimensions/alt/fallbacks; videos have posters/controls and are not allowed to autoplay audio.
- [ ] Loading, empty, validation, success, and recoverable error states exist.
- [ ] No dead buttons, pretend filters, placeholder policy links, or fabricated product/inventory facts remain in the shipping UI.
