# TrafficMENA Design System

> Last updated: January 1, 2026

---

## Brand Colors

### Primary Palette

| Color Name | HSL | Hex | Usage |
|------------|-----|-----|-------|
| **Primary Black** | `0 0% 6.3%` | `#101010` | Primary text, dark backgrounds |
| **Primary Green** | `146 96% 48%` | `#05ef62` | CTA buttons, links, accents |
| **Secondary Blue** | `193 100% 25%` | `#006681` | Secondary elements |

### Secondary/Accent Colors

| Color Name | Hex | Usage |
|------------|-----|-------|
| **Caribbean Green** | `#20d68e` | Secondary green accent |
| **Bright Teal** | `#00fdc2` | Highlights, hover states |
| **Gradient End** | `#29cf9f` | Gradient transitions |

---

## Color Tokens (CSS Variables)

### Light Mode (`:root`)

```css
--background: 0 0% 100%;           /* White */
--foreground: 0 0% 6.3%;           /* Near black */
--card: 0 0% 100%;                 /* White */
--card-foreground: 0 0% 6.3%;      /* Near black */
--popover: 0 0% 100%;              /* White */
--popover-foreground: 0 0% 6.3%;   /* Near black */
--muted: 210 40% 96.1%;            /* Light gray */
--muted-foreground: 215.4 16.3% 46.9%;  /* Medium gray */
--accent: 210 40% 96.1%;           /* Light gray */
--accent-foreground: 0 0% 6.3%;    /* Near black */
--border: 214.3 31.8% 91.4%;       /* Light border */
--input: 214.3 31.8% 91.4%;        /* Input border */
--ring: 0 0% 6.3%;                 /* Focus ring */
--destructive: 0 84.2% 60.2%;      /* Red */
--radius: 0.5rem;                  /* Border radius */
```

### Dark Mode (`.dark`)

```css
--background: 222.2 84% 4.9%;      /* Deep blue-black */
--foreground: 210 40% 98%;         /* Off-white */
--card: 222.2 84% 4.9%;            /* Deep blue-black */
--card-foreground: 210 40% 98%;    /* Off-white */
--popover: 222.2 84% 4.9%;         /* Deep blue-black */
--popover-foreground: 210 40% 98%; /* Off-white */
--muted: 217.2 32.6% 17.5%;        /* Dark gray */
--muted-foreground: 215 20.2% 65.1%;  /* Medium gray */
--accent: 217.2 32.6% 17.5%;       /* Dark gray */
--accent-foreground: 210 40% 98%;  /* Off-white */
--border: 217.2 32.6% 17.5%;       /* Dark border */
--input: 217.2 32.6% 17.5%;        /* Input border */
--ring: 212.7 26.8% 83.9%;         /* Focus ring */
--destructive: 0 62.8% 30.6%;      /* Dark red */
```

---

## Brand Gradients

| Gradient | CSS | Usage |
|----------|-----|-------|
| **Brand Gradient** | `linear-gradient(135deg, #05ef62, #29cf9f)` | Primary buttons, hero sections |
| **Secondary Gradient** | `linear-gradient(135deg, #006681, #00fdc2)` | Secondary elements, cards |

### Utility Classes

```css
.gradient-brand {
  background: linear-gradient(135deg, hsl(var(--primary-green)), #29cf9f);
}

.gradient-secondary {
  background: linear-gradient(135deg, hsl(var(--secondary)), #00fdc2);
}
```

---

## Typography

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Body | Default | 400 | 1.7 |
| Headings (h1-h4) | Various | 700 (Bold) | Default |
| Links | Default | 600 (Semi-bold) | Default |
| Code | Default | 500 (Medium) | Default |

### Link Styles
- **Default**: Primary Green (`#05ef62`)
- **Hover**: Bright Teal (`#00fdc2`) + underline
- **Dark Mode**: Inverted (Teal default → Green hover)

---

## Shadows

| Shadow | Light Mode | Dark Mode |
|--------|------------|-----------|
| **Brand Shadow** | `0 4px 6px -1px rgba(5, 239, 98, 0.1), 0 2px 4px -1px rgba(5, 239, 98, 0.06)` | `0 4px 6px -1px rgba(5, 239, 98, 0.2), 0 2px 4px -1px rgba(5, 239, 98, 0.1)` |

---

## Border Radius

| Size | Value |
|------|-------|
| `lg` | `0.5rem` (8px) |
| `md` | `0.375rem` (6px) |
| `sm` | `0.25rem` (4px) |

---

## Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `fadeIn` | 0.8s | ease-out | Page load elements |
| `fadeInUp` | 0.8s | ease-out | Content reveal |
| `slideInLeft` | 0.8s | ease-out | Side panels |
| `slideInRight` | 0.8s | ease-out | Side panels |
| `gentleBounce` | 2s | ease-in-out (infinite) | CTA attention |
| `pulse` | 4s | ease-in-out (infinite) | Background effects |
| `accordion-down/up` | 0.2s | ease-out | Accordion components |

### Utility Classes

```css
.animate-fade-in
.animate-fade-in-up
.animate-slide-in-left
.animate-slide-in-right
.animate-bounce
.animate-pulse
```

---

## Theme Transitions

All theme-sensitive elements transition smoothly:

```css
transition: background-color 0.2s ease-in-out, 
            border-color 0.2s ease-in-out,
            color 0.2s ease-in-out;
```

---

## Accessibility

### Focus States

```css
.focus-brand:focus {
  outline: 2px solid hsl(var(--primary-green));
  outline-offset: 2px;
}
```

---

## UI Component Library

- **Base**: Radix UI Primitives
- **Styling**: Shadcn UI patterns + Tailwind CSS
- **Icons**: Lucide React

---

## Visual Style Summary

| Attribute | Description |
|-----------|-------------|
| **Theme** | Light & Dark mode support |
| **Aesthetic** | Modern, clean, professional |
| **Primary Feel** | Green-accented with high contrast |
| **Effects** | Glassmorphism, subtle gradients |
| **Motion** | Smooth micro-animations |
