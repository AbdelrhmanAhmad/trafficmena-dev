---
title: Local Default Images Pattern
category: ui-patterns
tags: [images, reliability, fallback, static-assets]
severity: low
components: [events, tracks, cards]
symptoms:
  - External image URLs can become unavailable
  - Unsplash rate limits can cause broken images
  - Inconsistent branding with random external images
root_cause: Dependency on external image services for defaults
resolution_date: 2026-02-02
---

# Local Default Images Pattern

## Problem

Card components were using external Unsplash URLs as fallback images:

```tsx
// Before - unreliable external dependency
const imageUrl = event.imageUrl || 'https://images.unsplash.com/photo-xxx?w=800';
```

Issues:
- Unsplash can rate-limit or change URLs
- Network latency for external images
- Inconsistent branding
- No control over image availability

## Solution

### 1. Create Local Default Images

Added branded placeholder images:
- `public/uploads/trafficmena-event.png` - Default for events
- `public/uploads/trafficmena-track.png` - Default for tracks

### 2. Update Components

```tsx
// After - local, reliable, branded
const DEFAULT_EVENT_IMAGE = '/uploads/trafficmena-event.png';
const DEFAULT_TRACK_IMAGE = '/uploads/trafficmena-track.png';

// In EventCard
<img
  src={event.imageUrl || DEFAULT_EVENT_IMAGE}
  alt={event.title}
  className="object-contain aspect-[2/1]"
/>

// In TrackCard
<img
  src={track.imageUrl || DEFAULT_TRACK_IMAGE}
  alt={track.title}
  className="object-contain aspect-[2/1]"
/>
```

### 3. Consistent Aspect Ratio

Changed from arbitrary ratio to standard `2/1`:

```tsx
// Before
<div className="aspect-[320/210]">
  <img className="object-cover" />
</div>

// After
<div className="aspect-[2/1]">
  <img className="object-contain" />
</div>
```

**Why `object-contain`:** Prevents cropping of important content in uploaded images.

## Files Changed

**New assets:**
- `public/uploads/trafficmena-event.png`
- `public/uploads/trafficmena-track.png`

**Updated components:**
- `src/features/events/components/EventCard.tsx`
- `src/features/tracks/components/PublicTrackCard.tsx`
- `src/features/events/pages/EventDetail.tsx`
- `src/features/tracks/pages/TrackDetail.tsx`

## Benefits

1. **Reliability** - No external service dependency
2. **Speed** - Served from same origin, can be cached
3. **Branding** - Consistent visual identity
4. **Control** - Easy to update without code changes

## Image Specifications

For future default images:
- **Format:** PNG (transparency support) or WebP
- **Dimensions:** 800x400px (2:1 aspect ratio)
- **Location:** `public/uploads/`
- **Naming:** `trafficmena-{type}.png`

## Prevention

1. Always use local assets for default/fallback images
2. Store in `public/uploads/` for easy access
3. Use consistent aspect ratios (2:1 recommended)
4. Brand placeholder images with logo/colors
