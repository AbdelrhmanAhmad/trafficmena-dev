# Plan: Founders on About Us + Orion Growth ownership line (About + Footer)

**Date:** 2026-09-01
**Scope:** Frontend only. 2 files edited, 2 image assets added. No backend, no schema, no i18n.

## Goal

Show both co-founders on the About Us page (photo, title, LinkedIn — same data as
https://www.meriin.com/about/, with a new photo for Hosny) and state on both the About
page and the site-wide footer that TrafficMENA is owned by Orion Growth for Technology.
Keep the content minimal: names, titles, LinkedIn links, one ownership line. No bios.

## Founder data (from meriin.com/about, verified live)

| Name | Title | LinkedIn |
|------|-------|----------|
| Mohammed Shahat | Co-Founder & CEO | https://www.linkedin.com/in/mohammedshahat/ |
| Hosny Abdelrahman | Co-Founder & Chief Growth Officer | https://www.linkedin.com/in/meethosny/ |

## Steps

### 1. Image assets → `public/team/`

- `mohammed-shahat.jpg`: download from `https://www.meriin.com/team/mohammed-shahat.jpeg`.
- `hosny-abdelrahman.jpg`: from the new photo the user supplied (cached at
  `~/.claude/image-cache/606d89f3-eb52-43b4-89b4-7792b7406fc5/1.png`, ~2MB PNG).
  One `sips` pass: convert to JPG, resize to ~800px width so a multi-MB PNG doesn't ship.
- Do NOT hand-crop pixels. Crop like Meriin does — in CSS: both photos rendered with
  identical classes `aspect-square object-cover object-top rounded-2xl`
  (fallback `object-[center_20%]` if the top-anchor framing cuts oddly).
  This keeps both cards consistent regardless of source aspect ratios.

### 2. `src/pages/About.tsx` — founders section + ownership line

After the existing hero card, add a second section in the same card style:

- Heading: **"The founders"**
- Two cards, side by side on `sm:` (photo, name, title, LinkedIn link).
  LinkedIn links: `target="_blank" rel="noopener noreferrer"` (existing footer idiom).
- Below the cards, one line (brand relationship, not separate company):

  > TrafficMENA is a brand of Orion Growth for Technology.

### 3. `src/shared/components/layout/Footer.tsx` — bottom bar

Both `Layout` and `AppLayout` render this one `Footer`, so a single edit covers the
entire site. Fold ownership into the copyright line (and fix the stale 2024):

> © 2026 TrafficMENA, a brand of Orion Growth for Technology. All rights reserved.

User ruling 2026-09-01: "an Orion Growth for Technology company" is rejected — it reads
as a separate company. Phrasing must present TrafficMENA as a brand inside Orion Growth
for Technology.

(Use `new Date().getFullYear()` instead of a hardcoded year.)
Keep the existing `| Digital Marketing Community for the MENA Region` tail or drop it —
default: keep.

### 4. Verify

- `npm run dev` → check `/about` (founders render, links open, photos crop cleanly)
  and footer on `/` + a logged-in page (AppLayout).
- `npm run lint`.

## Guardrails

- **No invented content.** Names, titles, LinkedIn only. No bios, no origin story.
- **Alt text = bare names** ("Hosny Abdelrahman") — Ultracite bans "photo/image" in alt.
- **English only.** The static pages carry no Arabic today; don't introduce it here.
- **Confirm before merge:** registered spelling of the company name — user wrote both
  "Orion Growth For Technology" and "Orion Growth for Technology". Plan uses
  lowercase "for" (natural English casing); flip to capital "For" if that's the
  registered name.
