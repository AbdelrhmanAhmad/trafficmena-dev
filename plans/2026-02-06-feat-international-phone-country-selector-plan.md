---
title: "feat: International Phone Number with Country Code Selector"
type: feat
date: 2026-02-06
branch: project-enhancement-life
revised: true
revision-note: "Simplified after 3-reviewer feedback. Dropped Popover+Command in favor of Shadcn Select. Signup only (Dashboard deferred). Country data in one file."
---

# feat: International Phone Number with Country Code Selector

## Overview

The signup flow (Step 3) currently hardcodes `+20` (Egypt) as the phone number country code. Users outside Egypt cannot sign up properly. This enhancement replaces the hardcoded prefix with a country code `<Select>` dropdown (using existing Shadcn Select), with MENA countries prioritized at top, and all other countries listed below.

**Scope: Signup Step 3 only.** Dashboard profile edit deferred to a follow-up PR — it already works with free-text entry.

## Problem Statement

- Phone field defaults to `+20` with no way to change country code via UI
- Validation strips `+20` specifically — breaks non-Egyptian numbers
- MENA region users (UAE, Saudi, Jordan, etc.) cannot properly sign up

## Proposed Solution

In `Step3.tsx`, replace the single `<Input>` with a flex row:
- **Left:** Shadcn `<Select>` showing `🇪🇬 +20` (flag + dial code), grouped by MENA / Other
- **Right:** `<Input type="tel">` for local number digits
- On submit: concatenate `+{dialCode}{localDigits}` and store in context/DB

No new components. No new abstractions. Two files modified, one new data file.

## Technical Approach

### Architecture

```
src/shared/data/
└── countries.ts                 # Static country data (MENA + all others)

src/pages/signup/Step3.tsx       # Modified: Select + Input replacing single Input

server/src/routes/api/users.ts   # Modified: add regex to Zod schema (1 line)
```

### Country Data: `src/shared/data/countries.ts`

```typescript
interface Country {
  code: string;   // ISO 3166-1 alpha-2 (e.g., "EG")
  name: string;   // English name (e.g., "Egypt")
  dial: string;   // Dial code without + (e.g., "20")
  flag: string;   // Emoji flag (e.g., "🇪🇬")
}

const MENA_COUNTRIES: Country[] = [
  { code: "EG", name: "Egypt",               dial: "20",  flag: "🇪🇬" },
  { code: "SA", name: "Saudi Arabia",        dial: "966", flag: "🇸🇦" },
  { code: "AE", name: "United Arab Emirates", dial: "971", flag: "🇦🇪" },
  { code: "KW", name: "Kuwait",              dial: "965", flag: "🇰🇼" },
  { code: "QA", name: "Qatar",               dial: "974", flag: "🇶🇦" },
  { code: "BH", name: "Bahrain",             dial: "973", flag: "🇧🇭" },
  { code: "OM", name: "Oman",                dial: "968", flag: "🇴🇲" },
  { code: "JO", name: "Jordan",              dial: "962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",             dial: "961", flag: "🇱🇧" },
  { code: "IQ", name: "Iraq",                dial: "964", flag: "🇮🇶" },
  { code: "PS", name: "Palestine",           dial: "970", flag: "🇵🇸" },
  { code: "YE", name: "Yemen",               dial: "967", flag: "🇾🇪" },
  { code: "SY", name: "Syria",               dial: "963", flag: "🇸🇾" },
  { code: "LY", name: "Libya",               dial: "218", flag: "🇱🇾" },
  { code: "TN", name: "Tunisia",             dial: "216", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria",             dial: "213", flag: "🇩🇿" },
  { code: "MA", name: "Morocco",             dial: "212", flag: "🇲🇦" },
  { code: "MR", name: "Mauritania",          dial: "222", flag: "🇲🇷" },
  { code: "SD", name: "Sudan",               dial: "249", flag: "🇸🇩" },
  { code: "SO", name: "Somalia",             dial: "252", flag: "🇸🇴" },
  { code: "DJ", name: "Djibouti",            dial: "253", flag: "🇩🇯" },
  { code: "KM", name: "Comoros",             dial: "269", flag: "🇰🇲" },
];

const OTHER_COUNTRIES: Country[] = [
  // ~200 countries, alphabetical by name
  { code: "AF", name: "Afghanistan",  dial: "93",  flag: "🇦🇫" },
  { code: "AL", name: "Albania",      dial: "355", flag: "🇦🇱" },
  // ... etc
];

const ALL_COUNTRIES = [...MENA_COUNTRIES, ...OTHER_COUNTRIES];

export type { Country };
export { MENA_COUNTRIES, OTHER_COUNTRIES, ALL_COUNTRIES };
```

This is the only new file. It's a static data file — no logic, no abstractions.

### Step3.tsx Changes

Replace the current single `<Input>` (lines 80-105) with a flex row:

**New state:**
```typescript
// Parse existing formData.phoneNumber to extract country + local
const defaultDial = "20"; // Egypt
const [selectedDial, setSelectedDial] = useState(() => {
  const saved = formData.phoneNumber;
  if (!saved || !saved.startsWith("+")) return defaultDial;
  const withoutPlus = saved.replace(/^\+/, "");
  // Match against known dial codes (longest first to avoid +1 vs +1xxx collisions)
  const sortedMena = [...MENA_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const sortedOther = [...OTHER_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of [...sortedMena, ...sortedOther]) {
    if (withoutPlus.startsWith(c.dial)) return c.dial;
  }
  return defaultDial;
});

const [localNumber, setLocalNumber] = useState(() => {
  const saved = formData.phoneNumber;
  if (!saved) return "";
  const cleaned = saved.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned.slice(1).replace(new RegExp(`^${selectedDial}`), "");
  }
  return cleaned.replace(/^\+?20/, "");
});
```

**UI layout:**
```
┌────────────────────────────────────────────────────────┐
│ [🇪🇬 +20  ▾] │  1234567890                    🟢      │
│  (Select)      │  (Input type="tel")     (WhatsApp)    │
└────────────────────────────────────────────────────────┘
```

```tsx
<div className="relative mt-1 flex gap-2">
  {/* Country code selector */}
  <Select value={selectedDial} onValueChange={(dial) => {
    setSelectedDial(dial);
    if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
  }}>
    <SelectTrigger className="w-[130px] shrink-0 rounded-xl border-neutral-200">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>MENA Region</SelectLabel>
        {MENA_COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.dial}>
            {c.flag} +{c.dial}
          </SelectItem>
        ))}
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Other Countries</SelectLabel>
        {OTHER_COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.dial}>
            {c.flag} +{c.dial}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>

  {/* Local number input */}
  <div className="relative flex-1">
    <Input
      id={phoneInputId}
      type="tel"
      dir="ltr"
      value={localNumber}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        setLocalNumber(digits);
        if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
      }}
      placeholder="1234567890"
      className={`rounded-xl border-neutral-200 ${errors.phoneNumber ? 'border-red-500' : ''}`}
      required
    />
    {/* WhatsApp icon (existing SVG) */}
    <div className="absolute right-3 top-1/2 -translate-y-1/2 transform">
      {/* ... existing WhatsApp SVG ... */}
    </div>
  </div>
</div>
```

**Updated validation:**
```typescript
const validatePhone = (): string | undefined => {
  if (!localNumber.trim()) return "WhatsApp number is required";
  if (localNumber.length < 7) return "Phone number too short";
  if (localNumber.length > 15) return "Phone number too long";
  if (!/^\d+$/.test(localNumber)) return "Please enter a valid phone number";
  return undefined;
};
```

**Updated handleNext:**
```typescript
const handleNext = async () => {
  const phoneError = validatePhone();
  if (phoneError) {
    setErrors({ phoneNumber: phoneError });
    return;
  }
  setIsLoading(true);
  await new Promise((resolve) => setTimeout(resolve, 300));
  // Store as +{code}{digits} — no spaces
  updateFormData({ phoneNumber: `+${selectedDial}${localNumber}` });
  navigate('/signup/step-4');
  setIsLoading(false);
};
```

**Updated handleBack:**
```typescript
const handleBack = async () => {
  setIsLoading(true);
  await new Promise((resolve) => setTimeout(resolve, 200));
  updateFormData({ phoneNumber: `+${selectedDial}${localNumber}` });
  navigate('/signup/step-2');
  setIsLoading(false);
};
```

**Updated isValid:**
```typescript
const isValid = localNumber.trim().length >= 7 && !errors.phoneNumber && !isLoading;
```

### Backend Validation: `server/src/routes/api/users.ts`

One-line change at line 13:

```typescript
// Before:
phoneNumber: z.string().max(50).optional(),

// After:
phoneNumber: z.string().max(50).regex(/^\+[1-9]\d{7,18}$/, "Invalid phone number format").optional(),
```

Validates: starts with `+`, non-zero digit, then 7-18 more digits. Simple, covers all international formats.

### No Database Migration

`profiles.phone_number` is already `text` type, nullable. No schema change needed.

## File Changes Summary

| File | Action | LOC Change (est.) |
|------|--------|-------------------|
| `src/shared/data/countries.ts` | **New** | ~250 (mostly data) |
| `src/pages/signup/Step3.tsx` | **Modified** | ~40 lines changed |
| `server/src/routes/api/users.ts` | **Modified** | 1 line changed |
| **Total** | 1 new, 2 modified | ~290 LOC |

## Acceptance Criteria

- [x] Country selector shows flag emoji + dial code for each country
- [x] Egypt (`+20`) is the default selected country
- [x] MENA countries (22 Arab League members) appear in a prioritized group at the top
- [x] All other countries listed alphabetically below MENA group, separated by divider
- [x] Selecting a country updates the displayed flag + code immediately
- [x] Phone number stored in database as `+{code}{digits}` (no spaces)
- [x] Returning to Step 3 (back navigation) restores previously selected country + number
- [x] WhatsApp branding preserved (heading, icon, helper text)
- [x] Backend validates phone format with regex on save
- [x] `npm run lint` passes

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User changes country after entering digits | Digits preserved, user edits manually |
| User types non-digit characters | Stripped (onChange filters to digits only) |
| Returning from Step 4 (back nav) | Country + digits restored from context |
| formData.phoneNumber is empty/null | Default to Egypt, empty input |
| formData has old `+20XXXXXXXXX` format | Parses correctly — Egypt selected, digits shown |
| formData has non-Egyptian format (e.g. `+971XXX`) | Correct country selected, digits shown |
| Very long number (>15 digits) | Validation error: "Phone number too long" |

## Implementation Order

1. **Create `src/shared/data/countries.ts`** — static data, no deps
2. **Update `src/pages/signup/Step3.tsx`** — Select + Input row
3. **Update `server/src/routes/api/users.ts`** — regex in Zod schema
4. **Manual test** — signup flow end-to-end
5. **Lint check** — `npm run lint`

## Dependencies & Risks

**No new dependencies.** Uses existing:
- Shadcn `Select`, `SelectGroup`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectContent`, `SelectTrigger`, `SelectValue` from `@/shared/components/ui/select`
- Shadcn `Input` from `@/shared/components/ui/input`
- `@radix-ui/react-select` — already installed

**Risk: Country data accuracy.** Static list must have correct dial codes and flag emojis. Mitigated by using ISO 3166-1 alpha-2 standard codes.

**Risk: Dial code collisions.** Some countries share codes (US/Canada +1). The longest-match-first parsing in state initialization handles this. For the Select dropdown, each entry has a unique ISO code — duplicates display separately.

## What's Deferred

- **Dashboard phone field**: Already works with free-text entry. Adding a country selector there is a UX enhancement, not a blocker. Can be a follow-up PR.
- **Auto-formatting**: Numbers stored and displayed as raw digits. Formatting is a nice-to-have.
- **Per-country validation**: Global 7-15 digit range. Country-specific rules (e.g., "UAE numbers are 9 digits") deferred.
- **Country auto-detection**: No IP/locale-based detection. Egypt is always the default.

## References

### Internal
- Current Step 3: `src/pages/signup/Step3.tsx`
- Select component: `src/shared/components/ui/select.tsx`
- SignUp context: `src/shared/components/layout/SignUpLayout.tsx:19-30`
- DB schema: `server/src/db/schema/index.ts:56`
- Backend validation: `server/src/routes/api/users.ts:9-17`

### Institutional Learnings Applied
- `docs/solutions/code-quality/react-form-accessibility-patterns.md` — Use `React.useId()` for form input IDs
- `docs/solutions/security-issues/pre-launch-security-hardening.md` — Zod validation on all API inputs
