# Rootline

Habit tracker + Pomodoro focus timer + a growing island world. Cross-device (iOS, Android, Web; desktop later).
Product spec: [docs/PRD.md](docs/PRD.md). Expo-specific guidance: @AGENTS.md

## Ground rules (from the project owner — always follow)

1. **Design needs a reference image first.** Before designing any screen, component, the island world, icons,
   or anything visual, ask the owner for an image that shows their design idea. Build the design from that image,
   then record the theme (colors, typography, shapes, mood) in [docs/DESIGN.md](docs/DESIGN.md) and follow it
   everywhere in the project. Do not invent a visual style without the owner's image.
2. The app is named **Rootline** for now.

## Layout

- `src/app/` — Expo Router screens only.
- `src/core/` — pure, platform-free domain logic (dates, streaks, scores, timer). No React or Expo imports here.
- `src/components/`, `src/hooks/`, `src/constants/` — UI building blocks.

## Checks

```bash
npm test            # unit tests (vitest) for src/core
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```
