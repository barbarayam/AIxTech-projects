# THEMES.md

Theme registry for Weather Starter. Each theme is implemented as a scoped CSS block in `frontend/src/index.css` and registered in the `THEMES` array in `frontend/src/state/theme.tsx`. No component changes are needed to add a new theme.

## Implemented

### `apple` ✅ (default)

_The original Apple Weather-inspired look._

- **Color:** Blue-grey gradient (`#6f8aa8` → `#3c5066`), warm white radial highlight top-right
- **Typography:** Unchanged — light weight, natural tracking
- **Cards:** Frosted white glass (`bg-white/[0.08]`), `border-white/15`
- **Density:** Standard

---

### `aurora-glass` ✅

_Aurora-borealis glow (teal/violet/sky-blue) over a deep indigo night sky._

- **Color:** `#1e1b4b` → `#1b2436` base; teal (`rgba(45,212,191)`) and violet (`rgba(129,140,248)`) radial glows; sky-blue (`#38bdf8`) accents on borders and rings
- **Typography:** Slightly wider letter-spacing on labels (`0.14em` → `0.22em`, `0.18em` → `0.26em`)
- **Cards:** Sky-blue tinted frosted glass (`rgba(56,189,248,0.16)`), sky-blue borders
- **Density:** Standard

---

### `nordic-frost` ✅

_Icy Scandinavian minimal — near-white backgrounds with cool steel-blue tints._

- **Color:** `#f8fafc` → `#dbeafe` light ice-blue gradient; all text flipped from white to dark slate (`#1e293b` → `#cbd5e1` scale); cornflower-blue focus rings
- **Typography:** Slightly wider tracking on labels (`0.14em` → `0.18em`, `0.18em` → `0.22em`); text naturally lighter due to slate scale
- **Cards:** Translucent white (`rgba(255,255,255,0.62)`) with hairline slate borders (`rgba(148,163,184,0.3)`)
- **Density:** Airy — same layout but whitespace reads wider due to light background
- **Implementation notes:** Light theme requires overriding every `text-white/*` shade, all `bg-black/20` and `bg-white/*` panels, all `border-white/*` shades, dividers, placeholders, and hover/focus states. Map pin text kept white via `.weather-map-pin` exception rules. Submit button inverted to dark (`#1e293b`) since `bg-white/90` is invisible on a light ground.

---

## Planned

### `sunset-dusk`

_A warm California-sunset gradient shifting from amber through coral to deep violet._

- **Color:** Amber → coral → deep violet background; gold accents; cream-white text
- **Typography:** Unchanged weight, warm cream text
- **Cards:** Warm-rose frosted glass (`rgba(255,160,80,0.12)`)
- **Density:** Standard

---

### `golden-hour`

_Warm amber and honey tones, like the last hour before sunset on a clear day._

- **Color:** Deep amber → burnt orange → warm brown; gold accents
- **Typography:** Slightly wider tracking on labels for a warm editorial feel
- **Cards:** Amber-tinted frosted glass (`rgba(251,191,36,0.13)`)
- **Density:** Standard

---

### `ocean-depth`

_Deep navy-to-teal gradient evoking an open ocean at dusk._

- **Color:** `#0a192f` → `#0e6073`; teal accents (`rgba(20,184,166)`)
- **Typography:** Unchanged
- **Cards:** Teal-tinted frosted glass (`rgba(20,184,166,0.15)`)
- **Density:** Standard

---

### `monsoon`

_Muted, desaturated grey-greens — the mood of a rainy afternoon._

- **Color:** `#2d3a3a` → `#4a5a50`; sage green accents; slightly dimmed text opacity
- **Typography:** Tighter tracking, muted text
- **Cards:** Very low contrast frosted glass, olive-grey tint
- **Density:** Standard

---

### `desert-sand`

_Sun-baked terra-cotta and warm sand — dry, earthy, high-contrast._

- **Color:** `#5c3a1e` → `#c8934a`; sand-white text
- **Typography:** Bold labels, no tracking change
- **Cards:** Warm sandy frosted glass (`rgba(210,160,80,0.18)`)
- **Density:** Compact — smaller tiles

---

### `neon-city`

_Dark charcoal base with electric neon-green accents — cyberpunk night market._

- **Color:** `#111318` base; neon green (`#39ff14`) accent; magenta secondary
- **Typography:** Tracked-out uppercase labels for a monospace-ish feel
- **Cards:** Dark panels with neon border glow (`box-shadow: 0 0 12px #39ff14`)
- **Density:** Tight — data-dense, smaller padding

---

### `cherry-blossom`

_Soft sakura pinks and whites — light, airy, Japanese spring aesthetic._

- **Color:** Blush pink → white → pale lavender; deep rose accents
- **Typography:** Light weight, natural tracking
- **Cards:** Soft white frosted glass with pink tint
- **Density:** Airy — generous whitespace, rounded cards
- **Note:** Light theme — requires same class-override approach as `nordic-frost`

---

### `volcanic`

_Molten dark reds and charcoal — deep, dramatic, high-energy._

- **Color:** `#1a0a0a` → `#4a1a1a`; lava-orange accents
- **Typography:** Unchanged weight, warm-white text
- **Cards:** Dark red-tinted frosted glass (`rgba(220,50,20,0.14)`)
- **Density:** Standard

---

## How to add a theme

1. Add `{ id: 'your-theme', name: 'Display Name' }` to `THEMES` in `frontend/src/state/theme.tsx`
2. Add a `[data-theme='your-theme'] { ... }` block at the end of `frontend/src/index.css`
3. For **dark themes** — only override what differs from the default (background, accent tints, borders). See `aurora-glass` as a minimal example.
4. For **light themes** — override every `text-white/*`, `bg-black/*`, `bg-white/*`, `border-white/*`, divide, placeholder, and hover/focus state. See `nordic-frost` as the reference implementation.
