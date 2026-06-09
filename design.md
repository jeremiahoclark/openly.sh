---
version: alpha
name: Open Air
description: Warm, optimistic identity for openly — a link tracker you own.
colors:
  primary: "#222222"
  secondary: "#6A6A6A"
  tertiary: "#E8500F"
  tertiary-deep: "#C03D08"
  tertiary-bright: "#FF6A2B"
  neutral: "#FFFFFF"
  surface-tint: "#FAF6EF"
  rule: "#DDDDDD"
  rule-soft: "#EBEBEB"
  success: "#1F7A47"
  success-soft: "#EDF7F0"
  danger: "#C13515"
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
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
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
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
  tile:
    backgroundColor: "{colors.surface-tint}"
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

The audience is developers and indie operators who see a hundred SaaS dashboards a week. We win by *not* looking like one: a clean white canvas organized by whitespace and hairlines instead of boxes-in-boxes, cream tiles instead of gray panels, one vivid flame accent instead of corporate blue, and a display face with personality instead of default system bold. Friendly, never cute; energetic, never loud.

The homepage is the product, not a brochure. A visitor should be able to reserve a link within five seconds of landing, and the page's single point of maximum color — the flame-orange Reserve button — should make the next step unmissable.

## Colors

A clean white canvas, quiet gray structure, and two accents with strict jobs: cream for warmth, flame for action.

- **Primary — Ink (#222222):** near-black for headlines, body copy, and the nav.
- **Secondary — Fog (#6A6A6A):** gray for ledes, captions, metadata, and sub-labels.
- **Tertiary — Flare (#E8500F):** the only saturated color on screen. Primary buttons, the accent word in the hero, live states, chart fills, the map ramp. Deep variant **#C03D08** for hover and small-text links; bright variant **#FF6A2B** for marks on dark tiles.
- **Neutral — White (#FFFFFF):** the page canvas, always. Content sits directly on it.
- **Surface tint — Cream (#FAF6EF):** the signature accent surface. Where a generic product would use gray `#F7F7F7`, openly uses cream: chips, feature tiles, empty states, table headers, the account panel, hover fills. Cream is a *surface*, never a page background.
- **Hairlines:** #DDDDDD for control borders, #EBEBEB for section dividers and subtle rules.
- **Functional:** success #1F7A47 on #EDF7F0; danger #C13515 on #FDF0F0.

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

Hierarchy comes from **whitespace and hairlines, not boxes**. Content pages are flat: sections separated by generous vertical padding and a 1px #EBEBEB rule. Containment is reserved for two cases:

- **Floating/interactive objects** (the link bar, auth panel, dropdowns) get the float shadow: `0 0 0 1px rgba(0,0,0,.02), 0 8px 24px rgba(0,0,0,.10)` — a near-invisible 1px edge plus a soft drop.
- **Tinted tiles** (cream fills) mark soft zones — feature tiles, empty states, the account panel — with no border and no shadow.

**Never nest containers.** A bordered or tinted surface must sit directly on the white canvas; if a design wants a box inside a box, remove the outer one.

## Shapes

Friendly but structured. **Pills (full radius) are for the brand moments**: the link bar, its inset submit button, chips, and ghost buttons. Standard controls use the quiet scale — buttons and inputs at 8px, cards and tables at 12px, tiles and panels at 16px. The logo tile uses a 16/64 corner ratio (25%).

## Components

- **Primary button:** Flare fill, white text, pill, 600 weight. Hover deepens to #C03D08. Exactly one per view.
- **Ghost button:** transparent with gray text and #DDDDDD hairline border, pill. Sign out, archive, secondary nav.
- **Inputs:** white fill, #DDDDDD hairline border, 8px radius, 3px Flare focus ring at 25% alpha.
- **Chips (trust row, plan pill, badges):** cream fill, ink text, pill, no border.
- **Link bar:** the hero object, modeled on a search bar — white pill, #DDDDDD hairline, float shadow, slug field + 1px divider + destination field, and an **inset pill submit button** (8px margin inside the bar). Gray until the form validates, then Flare.
- **Stat tiles:** bare numbers on the canvas — 13px Fog label over a 2rem tabular-nums figure, tiles separated by vertical #EBEBEB rules, no boxes.
- **Tables:** one hairline container at 12px radius; cream header row with 11px uppercase labels; cream row hover.
- **Empty states:** a cream rounded panel (12px) with one Fog sentence. Never dashed borders, never nested inside another panel.
- **Charts:** bars and fills in Flare; map ramps #FFE4D2 → Flare; gridlines in rule tone. One hue, varied tone.

## Logo

The mark is an **ink rounded-square tile carrying an open "o"**: a cream ring broken at the north-east, with a Flare arrow escaping through the gap. It is the product in one glyph — a link (the ring), opened (the gap), going somewhere (the arrow). Ring and arrow share one stroke weight (6.5/64) with round caps. Always use the tile; never set the bare ring directly on a page surface. Wordmark: lowercase "openly" in Bricolage Grotesque 700, tight tracking, ink.

## Do's and Don'ts

- Do use Flare for exactly one primary action per screen; everything else points at it.
- Do separate sections with whitespace and a 1px #EBEBEB rule — never with another box.
- Don't nest containers; one level of containment, sitting on white, is the maximum.
- Don't use cream as a page background — it is a surface accent (chips, tiles, empty states, table headers).
- Don't use dashed borders anywhere, especially empty states.
- Don't introduce a second saturated hue — charts, badges, and states stay in the Flare/cream family (green/red strictly for success/error).
- Don't exceed two font families; Bricolage is for headings only — never for body text or inputs.
- Do keep WCAG AA: ink on white (15.9:1); small Flare text only in the deep variant (#C03D08).
- Don't add stock imagery or illustration; the typography, the mark, and the cream tiles are the visual interest.
