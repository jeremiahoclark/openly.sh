---
version: alpha
name: Open Air
description: Warm, optimistic identity for openly — a link tracker you own.
colors:
  primary: "#201A17"
  secondary: "#6B6259"
  tertiary: "#E8500F"
  tertiary-deep: "#C03D08"
  tertiary-bright: "#FF6A2B"
  neutral: "#FAF6EF"
  surface: "#FFFFFF"
  surface-tint: "#FFF0E5"
  rule: "#E8E0D3"
  success: "#1F7A47"
  success-soft: "#EDF7F0"
  danger: "#C92A2A"
  danger-soft: "#FDF0F0"
typography:
  headline-display:
    fontFamily: Bricolage Grotesque
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.01em
  body-lg:
    fontFamily: system-ui
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: system-ui
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: system-ui
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
  label-md:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
  label-caps:
    fontFamily: system-ui
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
rounded:
  sm: 10px
  md: 14px
  lg: 20px
  xl: 28px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  gutter: 24px
  max-landing: 1280px
  max-dashboard: 1080px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.tertiary-deep}"
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.secondary}"
    rounded: "{rounded.full}"
    padding: 8px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: 14px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
  chip:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 8px
---

# Open Air — openly design system

## Overview

openly is a short-link tracker you own outright — the domain, the code, the click data. The interface should feel the way that ownership feels: **warm, light, and quietly confident**. Daylight, not dashboard-gray.

The audience is developers and indie operators who see a hundred SaaS dashboards a week. We win by *not* looking like one: cream paper instead of white-on-gray, one vivid flame accent instead of corporate blue, a display face with personality instead of default system bold. Friendly, never cute; energetic, never loud.

The homepage is the product, not a brochure. A visitor should be able to reserve a link within five seconds of landing, and the page's single point of maximum color — the flame-orange Reserve button — should make the next step unmissable.

## Colors

Warm neutrals carry the page; one high-chroma accent does all the pointing.

- **Primary — Espresso (#201A17):** warm near-black for headlines, body copy, and the nav. Black with the chill taken off.
- **Secondary — Driftwood (#6B6259):** warm gray for ledes, captions, metadata, and borders' text companions.
- **Tertiary — Flare (#E8500F):** the only saturated color on screen. Primary buttons, the accent word in the hero, live states, chart fills. Deep variant **#C03D08** for hover and small-text links (AA on cream); bright variant **#FF6A2B** for marks on dark tiles.
- **Neutral — Daylight (#FAF6EF):** warm cream page canvas. Pure white (**#FFFFFF**) is reserved for raised surfaces — cards, inputs, the link bar — so surfaces read as objects sitting on paper.
- **Surface tint — Peach (#FFF0E5):** soft fill for chips, badges, and the hero glow. Warmth without weight.
- **Functional:** success #1F7A47 on #EDF7F0; danger #C92A2A on #FDF0F0.

## Typography

Two voices: an expressive display face for moments, a quiet system face for everything else.

- **Display — Bricolage Grotesque (600–800):** hero headlines, page titles, card headings. Loaded from Google Fonts with `display=swap`; falls back to the system stack. Its slightly flared terminals give the brand its smile.
- **Body — system-ui stack:** 15–17px for paragraphs and UI. Zero load cost, native feel.
- **Labels:** 13–14px medium/semibold in the system face. Eyebrow/kicker text is 13px bold, uppercase, 0.08em tracking, set in Flare.
- Hierarchy comes from **weight and warmth, not size alone** — a 700-weight Bricolage headline over a Driftwood lede needs no divider.

## Layout

- Landing: centered single column, max 1280px, generous air — hero owns the first viewport. Section rhythm in 8px steps (24 / 40 / 64).
- Dashboard: max 1080px, denser 8px rhythm, cards in a 12/24px gap grid.
- The link bar (slug + destination + button) is the hero's focal object: one pill-shaped white bar, full-width up to 1000px.
- Forms group related fields inside cards with 24px internal padding.

## Elevation & Depth

Depth comes from **paper layering**: cream canvas → white card → peach tint detail. Shadows are warm and soft (`rgba(64, 32, 8, .10)` range), used only on the focal object per view (link bar, auth panel) plus a hairline warm border (#E8E0D3) on every raised surface. No glassmorphism, no heavy drop shadows, no dark mode (yet).

## Shapes

Round and friendly. **Pills (full radius) for everything interactive** — buttons, chips, the link bar. Cards at 20px, inputs at 14px, small elements at 10px. The logo tile uses a 16/64 corner ratio (25%). Never mix sharp corners in; if something must be rectangular, it gets at least 10px.

## Components

- **Primary button:** Flare fill, white text, pill, 600 weight. Hover deepens to #C03D08 and lifts 1px; press returns flat. Exactly one per view.
- **Ghost button:** transparent with warm-gray text and hairline border, pill. Sign out, archive, secondary nav.
- **Inputs:** white fill, warm hairline border, 14px radius, 3px Flare focus ring at 25% alpha.
- **Chips (trust row, plan pill, badges):** peach tint fill, espresso text, pill, 13px.
- **Link bar:** white pill, slug field + divider + destination field + Flare submit segment. Valid slug shows a green inset check; the submit segment is gray until the form validates, then turns Flare.
- **Stat cards:** white, 20px radius, label-md in Driftwood over a 1.5rem tabular number.
- **Charts:** bars and fills in Flare; map ramps cream → Flare; gridlines in rule tone. One hue, varied tone.

## Logo

The mark is an **espresso rounded-square tile carrying an open "o"**: a cream ring broken at the north-east, with a Flare arrow escaping through the gap. It is the product in one glyph — a link (the ring), opened (the gap), going somewhere (the arrow). Ring and arrow share one stroke weight (6.5/64) with round caps. On light surfaces use the tile; never set the bare ring on cream. Wordmark: lowercase "openly" in Bricolage Grotesque 700, tight tracking, espresso.

## Do's and Don'ts

- Do use Flare for exactly one primary action per screen; everything else points at it.
- Do set ledes and supporting copy in Driftwood, not faded black.
- Don't introduce a second saturated hue — charts, badges, and states stay in the Flare/peach family (green/red strictly for success/error).
- Don't use pure white as a page background; cream canvas, white objects.
- Don't exceed two font families; Bricolage is for headings only — never for body text or inputs.
- Do keep WCAG AA: body text in Espresso on cream (14.9:1); small Flare text only in the deep variant (#C03D08).
- Don't add stock imagery or illustration; the typography, the mark, and one warm glow are the visual interest.
