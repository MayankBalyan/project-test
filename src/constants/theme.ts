/**
 * "Ink & Cosmos" theme. See docs/DESIGN.md — every screen follows it. Monochrome only.
 */

export const Colors = {
  light: {
    paper: '#E8E7E3',
    surface: '#F4F3EF',
    ink: '#0E0E0E',
    inkSoft: '#4A4A48',
    muted: '#8C8B87',
    line: '#C9C8C3',
    face: '#FFFFFF',
    space: '#0E0E0E',
    /** Fill for drawn objects (planet, moon): white paper in light mode, dark paper in dark mode. */
    artFill: '#FFFFFF',
    heat: ['#C9C8C3', '#A8A7A3', '#737270', '#3D3D3B', '#0E0E0E'],
  },
  dark: {
    paper: '#0E0E0E',
    surface: '#1A1A1A',
    ink: '#ECEBE7',
    inkSoft: '#B4B3AF',
    muted: '#6E6D6A',
    line: '#2E2E2E',
    face: '#FFFFFF',
    // Lifted above the dark paper so blobs, the island sky and dark cards still stand out.
    space: '#2A2A28',
    artFill: '#1A1A1A',
    heat: ['#2E2E2E', '#55554F', '#8A8985', '#BDBCB8', '#ECEBE7'],
  },
} as const;

export type Palette = (typeof Colors)['light' | 'dark'];

export const Fonts = {
  display: 'Anton_400Regular',
  label: 'Oswald_500Medium',
  labelBold: 'Oswald_700Bold',
  body: 'SpaceMono_400Regular',
  bodyBold: 'SpaceMono_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  card: 22,
  pill: 999,
} as const;

export const Gutter = 20;
export const MaxContentWidth = 760;
export const WideBreakpoint = 768;
