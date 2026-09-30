# Rootline

Habit tracker + Pomodoro focus timer + a growing island world. Cross-device (iOS, Android, Web; desktop later).
Product spec: [docs/PRD.md](docs/PRD.md). Expo-specific guidance: @AGENTS.md

## Ground rules (from the project owner — always follow)

1. **Design needs a reference image first.** Before designing any screen, component, the island world, icons,
   or anything visual, ask the owner for an image that shows their design idea. Build the design from that image,
   then record the theme (colors, typography, shapes, mood) in [docs/DESIGN.md](docs/DESIGN.md) and follow it
   everywhere in the project. Do not invent a visual style without the owner's image.
2. The app is named **Rootline** for now.
3. **Theme: "Ink & Cosmos"** (from the owner's reference, `docs/design-reference.png`). Monochrome ink on grainy
   paper, starry black blobs, engraving-style space art. Every major heading and hero number uses the 3D font
   component `Heading3D`. Use tokens from `src/constants/theme.ts` and primitives from `src/components/ui.tsx`;
   never hard-code new colors or fonts. Full spec in `docs/DESIGN.md`.

## Layout

- `src/app/` — Expo Router screens only.
- `src/core/` — pure, platform-free domain logic (dates, streaks, scores, timer). No React or Expo imports here.
- `src/components/`, `src/hooks/`, `src/constants/` — UI building blocks.
- `src/state/` — app state (`store.tsx`) and on-device saving (`persist.ts`, localStorage on web, SQLite-backed on iOS/Android).
- `src/app/(tabs)/` — the four tab screens; `src/app/habit/` — add/edit habit screens (modal);
  `src/app/account.tsx` — sign in / account; `src/app/auth/callback.tsx` — OAuth return page.
- `src/lib/supabase.ts` — Supabase client (null when `.env` has no Supabase settings; the app must keep working).
- `src/state/auth.tsx` — session and sign-in actions (email code, Google, sign out).
- `supabase/` — local config, migrations and email template. Setup guide: [docs/SUPABASE.md](docs/SUPABASE.md).
  Every table needs row-level security so users only reach their own rows.

## Checks

```bash
npm test            # unit tests (vitest) for src/core
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```
