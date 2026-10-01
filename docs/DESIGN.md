# Istel design theme — "Ink & Cosmos"

Source: the owner's reference image (a "Voyager — Explore the Space" landing page), saved at
[`docs/design-reference.png`](design-reference.png). Every screen follows this file. Change it only when the owner
shares a new reference.

## Mood

Black ink on grainy paper. Hand-drawn, engraving-style space illustrations (planets, moons, stars, telescopes)
floating between big organic black blobs filled with stars. Calm, playful, strictly monochrome.

For Istel this becomes the story: **your island floats in space**. Focus plants things on it, habits water
them, and streaks light up more stars around it.

## Color (monochrome only — no hues)

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#E8E7E3` | `#0E0E0E` | Screen background |
| `surface` | `#F4F3EF` | `#1A1A1A` | Cards |
| `ink` | `#0E0E0E` | `#ECEBE7` | Text, borders, blobs, primary buttons |
| `inkSoft` | `#4A4A48` | `#B4B3AF` | Secondary text |
| `muted` | `#8C8B87` | `#6E6D6A` | Hints, disabled, captions |
| `line` | `#C9C8C3` | `#2E2E2E` | Dividers, empty heatmap cells |
| `face` | `#FFFFFF` | `#FFFFFF` | Front face of 3D headings, stars |
| `space` | `#0E0E0E` | `#2A2A28` | Blobs, dark cards and the island sky; in dark mode lifted above the paper so they still stand out |
| `artFill` | `#FFFFFF` | `#1A1A1A` | Fill of drawn objects (planet, moon) so their ink lines stay visible |

Heatmap (sequential, one "hue" — ink): levels 0–4 are `line`, 30%, 55%, 80% and 100% ink blended over `paper`.

Dark mode swaps paper and ink. Blobs and the space sky use the `space` token, a dark grey in dark mode so they stay visible.
People choose System, Light or Dark in Settings → Appearance (saved per device).

## Typography

| Role | Font | Style |
|---|---|---|
| **Display (major headings)** | **Anton** | UPPERCASE, **3D extruded** (`Heading3D`): white face, ink outline, stacked ink layers going down |
| Label / nav / buttons | Oswald Medium | UPPERCASE, letter-spacing 1 |
| Body | Space Mono | letter-spacing 0.5, bold for emphasis |
| Numbers (timer, streak count) | Anton | Large; the timer and hero numbers also use the 3D style |

**Rule: every major heading (screen titles, hero numbers) uses `Heading3D`.** Small section titles use Oswald.

## Shapes

- **Blobs**: organic black shapes with scattered white dots and 4-point sparkle stars. Used as hero cards and
  decorations. They can bleed off the screen edge like in the reference.
- **Cards**: `surface` fill, 2px ink border, 22px radius.
- **Buttons**: primary is a solid ink pill with paper text; secondary is a 2px ink outline pill.
- **Grain**: a fine noise texture covers every screen background.

## Illustration

Ink line art only: 2–2.5px ink strokes, white or paper fills, hatch lines for shading. Motifs: ringed planet,
cratered moon, sparkles, telescope, and the floating island with plants.

Plant growth stages: seed → sprout → young → mature. A given-up session leaves a **wilted** sprout (drooping
leaves), never a dead tree.

## Logo mark
- **Orbit** (chosen by the owner, inspired by their reference: thick even strokes, a drop with something
  nested inside, open gaps). An open drop, tip up, with a gap at the lower left, around an open ring (a
  planet's orbit) with a gap at the upper right. Flat stroke ends, sharp tip, ink only.
- Drawn on a 100×100 grid: drop circle r 26 centred at x 50, stroke 9; ring r 11, stroke 7.5. The whole shape
  is centred vertically in the box (tip to bottom 7.8–92.2).
- One source: `LogoMark` in `src/components/ink-art.tsx`. The same paths are in `site/favicon.svg`,
  `public/favicon.svg` and the site headers. The PNG icons (`public/icons/`, `assets/images/icon.png`,
  favicon, Android adaptive icon, splash) are rendered from `site/favicon.svg`. Change them all together.

## Layout

- Phone: content column with 20px gutters and a floating ink pill tab bar at the bottom.
- Wide screens (≥ 768px, web/desktop/tablet): top nav like the reference — logo mark + **ISTEL** on the
  left, uppercase Oswald links on the right. Content max width 760px.

## Motion

Slow and floaty: gentle drift on decorations, a soft press scale (0.97) on buttons. Nothing bouncy.
