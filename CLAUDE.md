# Istel

Habit tracker + Pomodoro focus timer + a growing island world. Cross-device (iOS, Android, Web; desktop later).
Product spec: [docs/PRD.md](docs/PRD.md). Expo-specific guidance: @AGENTS.md

## Ground rules (from the project owner — always follow)

1. **Design needs a reference image first.** Before designing any screen, component, the island world, icons,
   or anything visual, ask the owner for an image that shows their design idea. Build the design from that image,
   then record the theme (colors, typography, shapes, mood) in [docs/DESIGN.md](docs/DESIGN.md) and follow it
   everywhere in the project. Do not invent a visual style without the owner's image.
2. The app is named **Istel** (renamed from Rootline by the owner). Website and email domain: `istel.space`.
3. **Theme: "Ink & Cosmos"** (from the owner's reference, `docs/design-reference.png`). Monochrome ink on grainy
   paper, starry black blobs, engraving-style space art. Every major heading and hero number uses the 3D font
   component `Heading3D`. Use tokens from `src/constants/theme.ts` and primitives from `src/components/ui.tsx`;
   never hard-code new colors or fonts. Full spec in `docs/DESIGN.md`.

## Layout

- `src/app/` — Expo Router screens only.
- `src/core/` — pure, platform-free domain logic (dates, streaks, scores, timer). No React or Expo imports here.
- `src/components/`, `src/hooks/`, `src/constants/` — UI building blocks.
- `src/state/` — app state (`store.tsx`) and on-device saving (`persist.ts`, localStorage on web, SQLite-backed on iOS/Android).
- `src/app/(tabs)/` — the tab screens (Today, To-do, Focus, Island, Streaks); `src/app/todo/[id].tsx` — edit a to-do (modal); `src/app/habit/` — add/edit habit screens (modal);
  `src/app/login.tsx` — sign-in screen; `src/app/account.tsx` — account (sync, sign out, delete);
  `src/app/auth/callback.tsx` — OAuth return page. Sign-in is required: `src/app/_layout.tsx` guards every
  screen with `Stack.Protected` and waits for the first sync after sign-in.
- `src/lib/supabase.ts` — Supabase client (null when `.env` has no Supabase settings; the app must keep working).
- `src/state/auth.tsx` — session and sign-in actions (email code, Google, sign out).
- `src/lib/notifications(.web).ts` — schedules the plan from `core/notify-plan.ts`. Phones get real scheduled
  notifications; browsers only while the tab is open. The store re-plans after every relevant change.
- `src/lib/share-file(.web).ts` — export files (share sheet on phones, download on web).
- To-dos: rules in `core/todos.ts` (tested), deadline picker in `components/due-picker.tsx`, Focus dial in
  `components/focus-dial.tsx` (trees per session: `treesFor` in `core/world.ts`).
- Sync: rules in `core/sync.ts` (tested), Supabase calls in `lib/sync.ts`, scheduling and account linking in
  `state/use-sync.ts`. Every change in the store must record `updatedAt` and add to the outbox (`track`).
- `site/` — the public website for `istel.space` (landing, privacy policy, delete-account page): plain HTML/CSS
  in the same theme, fonts served locally.
  Motion: `site/motion.js` (reveal on scroll, hero parallax) plus the Motion block in `style.css`; only opacity,
  translate and scale are animated, and nothing moves under prefers-reduced-motion. Hosting and DNS: [docs/HOSTING.md](docs/HOSTING.md).
- `src/state/theme.ts` — System/Light/Dark choice (per device); `hooks/use-color-scheme.ts` applies it everywhere.
- `public/` — web shell for the installable app: `index.html`, `manifest.webmanifest`, `sw.js`, `icons/`;
  `src/lib/pwa(.web).ts` registers the service worker and powers the Install card in Settings.
- `src/lib/site.ts` — website links used in the app (privacy, account deletion, support email).
- `supabase/` — local config, migrations and email template. Setup guide: [docs/SUPABASE.md](docs/SUPABASE.md).
  Every table needs row-level security so users only reach their own rows.

## Checks

```bash
npm test            # unit tests (vitest) for src/core
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```
