# Istel — Product Requirements Document

| | |
|---|---|
| **Product** | Istel (working title) |
| **Type** | Cross-device habit tracker + focus timer with a growing "living world" |
| **Status** | Draft v0.1 |
| **Author** | Mayank Balyan |
| **Last updated** | 2026-09-30 |

---

## 1. Summary

Istel is a habit-building app that combines three ideas into one loop:

1. **Habit tracking** with GitHub-style streaks and a contribution heatmap.
2. **A Pomodoro focus timer** for deep work sessions.
3. **A living world** — a small island ecosystem that grows as you stay consistent.

Every focus session and every completed habit feeds the same world. Consistency over days and weeks is what makes it flourish. The app works on phone, tablet, desktop and web, and all of them stay in sync.

## 2. Problem

- Habit apps are easy to start and easy to forget. A checklist gives no emotional reason to come back.
- Focus timers and habit trackers are separate apps, so progress is split up and neither feels like part of one bigger goal.
- Streaks motivate people, but one missed day can wipe out months of progress. That makes people quit instead of recover.
- Most people use two or more devices. Progress logged on the laptop should show up on the phone right away.

## 3. Goals and non-goals

### Goals
- G1: Help users build and keep daily habits, measured by 30-day retention and streak length.
- G2: Make focus sessions satisfying and visible through the growing world.
- G3: Make streaks motivating without making them punishing (forgiveness mechanics).
- G4: Work fully on iOS, Android, Web and Desktop, with offline support and sync in seconds.

### Non-goals (v1)
- Social network features (feeds, public profiles). Friends are considered for v2.
- Blocking or locking other apps on the device.
- Deep integrations with to-do tools (Todoist, Notion). Considered for v2.
- Paid real-world tree planting (a possible later partnership, not v1).

## 4. How Istel differs from Forest

We take inspiration from the idea that "your focus grows something." We do not copy the mechanic.

| Forest | Istel |
|---|---|
| One tree per session, placed in a grid | **One evolving ecosystem** (an island) that changes over time |
| Trees are finished right away | Plants **mature over days** and only reach full growth if you keep coming back |
| Leaving the app kills the tree | Giving up on a session leaves a **wilted sprout** that can be revived by finishing the next session. No hard punishment. |
| Focus only | **Focus + habits** both feed the world: focus plants seeds, habits water them |
| Grid of trees | **Terrain, weather, seasons and wildlife** unlock through streaks and lifetime hours |

## 5. Target users

| Persona | Description | Key need |
|---|---|---|
| **Student (Aarav, 20)** | Studies for exams, gets distracted by his phone | Focus sessions, study streaks, a laptop + phone setup |
| **Remote worker (Priya, 28)** | Wants a morning routine and deep-work blocks | Pomodoro on desktop, habit reminders on phone |
| **Self-improver (Sam, 34)** | Tracks gym, reading, meditation | Flexible habit schedules, long-term stats |

## 6. Core loop

```
 Plan today  ─►  Focus session (Pomodoro)  ─►  Earn seed / plant grows
     ▲                                              │
     │                                              ▼
 Check heatmap  ◄─  Streak extends  ◄─  Complete habits (water plants)
     │
     └─►  World evolves (new terrain, weather, creatures)
```

## 7. Features and requirements

Priority: **P0** = MVP, **P1** = soon after launch, **P2** = later.

### 7.1 Habits

| ID | Requirement | Priority |
|---|---|---|
| H1 | Create a habit with name, icon, color and an optional description | P0 |
| H2 | Schedule types: daily, specific weekdays, X times per week, every N days | P0 |
| H3 | Habit kinds: **check** (done/not done), **count** (e.g. 8 glasses of water), **duration** (e.g. 30 min reading, can be linked to a focus session) | P0 (check, count), P1 (duration) |
| H4 | Mark complete from the Today screen with one tap. Undo is available. | P0 |
| H5 | Edit or back-fill up to 2 days in the past (this limit stops abuse of streaks) | P0 |
| H6 | Reminders per habit at custom times | P0 |
| H7 | Archive a habit (history is kept) and delete it (history is removed) | P0 |
| H8 | Group habits into routines (Morning, Evening) | P1 |
| H9 | Home-screen widgets for quick check-off (iOS/Android) | P1 |
| H10 | Notes or mood attached to a completion | P2 |

### 7.2 Streaks and the contribution heatmap

| ID | Requirement | Priority |
|---|---|---|
| S1 | **Per-habit streak**: consecutive *scheduled* periods completed. Days a habit is not scheduled never break its streak. | P0 |
| S2 | **Global streak**: consecutive days with at least one "qualifying action" (1 habit done OR 1 focus session of 25+ min) | P0 |
| S3 | **Contribution heatmap** (GitHub style): 52 weeks × 7 days grid. Cell color intensity = daily score (see 7.2.1). Available globally and per habit. | P0 |
| S4 | Tap a heatmap cell to see that day's details (habits done, focus minutes) | P0 |
| S5 | Current streak, longest streak and total active days shown on profile | P0 |
| S6 | **Rain Days** (streak freezes): earn 1 per 7-day streak, hold up to 3. Used automatically on a missed day. | P1 |
| S7 | Streak milestones at 7, 30, 100 and 365 days, each unlocking something in the world | P0 |
| S8 | Streak recovery: after a break, the previous streak is shown as "best" and the next milestone target stays visible, so progress never feels lost | P1 |

#### 7.2.1 Daily score (heatmap intensity)

```
score = (habits_completed / habits_scheduled) * 60      // up to 60 points
      + min(focus_minutes, 120) / 120 * 40              // up to 40 points
```

| Score | Level |
|---|---|
| 0 | Empty |
| 1–24 | Level 1 |
| 25–49 | Level 2 |
| 50–74 | Level 3 |
| 75–100 | Level 4 |

#### 7.2.2 Day boundaries
- A "day" is calculated in the **user's home time zone**, which is set in their profile.
- The day ends at a configurable hour (default 04:00), so night owls do not lose streaks at midnight.
- When travelling, the home time zone stays in use until the user changes it. This keeps streaks from breaking because of flights.

### 7.3 Focus timer (Pomodoro)

| ID | Requirement | Priority |
|---|---|---|
| F1 | Default cycle: 25 min focus / 5 min short break / 15 min long break after 4 sessions | P0 |
| F2 | Custom durations on a draggable circular dial (focus 10 min – 3 h, 5-minute steps), quick picks, breaks 1–30 min | P0 |
| F3 | Start, pause (limited to 2 pauses per session), resume, give up | P0 |
| F4 | Tag sessions (Study, Work, Reading…) and optionally link one to a duration habit | P0 |
| F5 | **Cross-device live timer**: a timer started on the laptop shows the same countdown on the phone, and can be paused or stopped there | P0 |
| F6 | Timer keeps running correctly when the app is in the background or the device sleeps (it is based on timestamps, not a ticking counter) | P0 |
| F7 | Notifications when a session or break ends | P0 |
| F8 | Optional ambient sounds (rain, forest, café) | P1 |
| F9 | Optional "Stay Focused" mode: leaving the app for more than 10 s on mobile marks the session as interrupted (the plant wilts, it does not die) | P1 |
| F10 | Stopwatch mode (count up) for open-ended sessions | P1 |
| F11 | Lock-screen / Dynamic Island / persistent notification countdown | P1 |
| F12 | Focus stats: total today/week/month, by tag, best time of day | P0 (basic), P1 (charts) |
| F14 | Focus heatmap on Streaks: 12 months of focus days (full square at 2 h+), focus streak, best streak, days focused, best day | P0 |

| F13 | A finished session plants one tree per full half hour (3 h = 6 trees); a given-up session leaves one wilted sprout | P0 |

### 7.3b To-dos

| ID | Requirement | Priority |
|---|---|---|
| T1 | A separate To-do tab: add a to-do with an optional deadline (quick picks or any day on a calendar, optional time) | P0 |
| T2 | Grouped as Late, Today, Coming up, No deadline and Done; tick off with a tap, edit notes and deadline, delete | P0 |
| T3 | Late and due-today to-dos also show on the Today screen | P0 |
| T4 | A reminder at the deadline (or 9:00 on the day without a time), with a switch in Settings | P0 |
| T5 | Synced across devices like habits (newest change wins, deletes reach every device) | P0 |

### 7.4 The living world ("Your Island")

The user owns a small floating island that starts as bare soil and grows into a rich ecosystem.

#### Growth rules

| Action | Effect in the world |
|---|---|
| Complete a focus session | Plants a **seed** of a species chosen before the session. Longer sessions give bigger species (25 min → flower/shrub, 50 min → sapling, 90+ min → rare tree). |
| Complete habits that day | **Waters** the plants. A plant needs to be watered on 3 separate days to reach full maturity. |
| Give up on a session | The seed becomes a **wilted sprout**. Finishing the next session revives it. |
| Global streak milestones | Unlock world features: **7 days** → stream, **30 days** → birds and butterflies, **100 days** → waterfall and new biome, **365 days** → seasonal cycle and night sky |
| Lifetime focus hours | **Expands the island**: 10 h, 50 h, 100 h, 250 h, 500 h each add land |
| Missed days | Grass turns dry and the weather becomes cloudy. Nothing is destroyed. One active day brings it back. |

#### World requirements

| ID | Requirement | Priority |
|---|---|---|
| W1 | Island view with plants placed automatically; the user can move them | P0 (auto), P1 (manual) |
| W2 | Plant growth stages: seed → sprout → young → mature | P0 |
| W3 | Starting set of 8 species; more unlocked with **Dew drops** (in-app currency earned only from focus minutes and habits; not sold for money in v1) | P0 |
| W4 | Biomes: Meadow (start), Forest, Desert oasis, Snowy pine, Cherry blossom | P0 (Meadow), P1 (rest) |
| W5 | Weather and time of day mirror the user's recent consistency | P1 |
| W6 | **Timelapse**: replay how the island grew over a week, month or year; export as a short video | P2 |
| W7 | Share a picture of the island | P1 |
| W8 | Tap a plant to see which session planted it (date, duration, tag) | P1 |

**Art direction:** soft, low-poly or isometric 2D illustration. Calm colors. The world should load in under 1 s on mid-range phones. v1 uses 2D isometric sprites (not 3D) to keep performance good on every device.

### 7.5 Today screen / dashboard (P0)
- Greeting, global streak with a flame/leaf icon, and today's score ring.
- List of today's habits with one-tap check-off.
- Big "Start focus" button, showing the last preset used.
- Small preview of the island, which opens the full world.

### 7.6 Stats (P0 basic, P1 advanced)
- Heatmap (global and per habit).
- Completion rate per habit (week/month/all time).
- Focus minutes per day/week and by tag.
- Best streaks leaderboard of the user's own habits.

### 7.7 Accounts and onboarding
| ID | Requirement | Priority |
|---|---|---|
| A1 | Sign-in required: the app opens on a sign-in screen; data is saved on the device and synced to the account | P0 |
| A2 | Sign in with email magic link, Google, and Apple | P0 |
| A3 | Local data merges into the account when the user signs up | P0 |
| A4 | Onboarding in 4 screens or less: habits + focus or just focus, optional starter habits (up to 3, removable), focus length, island name | P0 |
| A6 | Focus-only mode: habits can be turned off (Settings); the Today tab hides, Focus becomes home, and focus alone fills the day's score | P0 |
| A5 | Export all data (JSON/CSV) and delete account | P0 |

### 7.8 Notifications
- Habit reminders at chosen times (P0).
- Timer end (P0).
- "Streak at risk": one nudge in the evening if nothing is logged yet (P0, can be turned off).
- A notification is sent to only one device at a time. The device the user was last active on gets it; the others are silent.

## 8. Cross-device and sync

### 8.1 Platforms
| Platform | v1 | Notes |
|---|---|---|
| Android | ✅ | Phone + tablet |
| iOS / iPadOS | ✅ | Phone + tablet |
| Web (PWA) | ✅ | Installable, works offline |
| Desktop (Windows/macOS/Linux) | P1 | Wrapped web app, with a menu-bar/tray timer |
| Wear OS / watchOS | P2 | Timer controls and habit check-off |

### 8.2 Sync requirements
- **Offline-first**: every action works without internet and syncs later.
- **Sync time**: changes appear on other online devices within 3 seconds.
- **Conflicts**:
  - Habit completions are stored as events (add/undo), so edits from different devices merge without loss.
  - Settings and habit edits use last-write-wins per field.
  - The timer has **one active session per user**, stored on the server as `started_at`, `planned_duration`, and `paused_intervals`. Each device calculates the time left from these values, so all devices show the same countdown.
- The world state is **derived** from the event history (sessions + completions), not stored separately. That means it cannot get out of sync and can always be rebuilt.

### 8.3 Proposed tech stack

| Layer | Choice | Why |
|---|---|---|
| Mobile + Web | **Expo (React Native) + React Native Web**, TypeScript | One codebase for iOS, Android and Web |
| Desktop | **Tauri** wrapping the web build | Small, fast desktop apps; tray timer |
| World rendering | **react-native-skia** (canvas) | Fast 2D rendering on every platform |
| Local database | **SQLite** (expo-sqlite / wa-sqlite on web) | Offline-first storage |
| Backend | **Supabase** (Postgres, Auth, Realtime, Edge Functions) | Auth, realtime sync and a relational DB with little ops work |
| Sync | Event log + per-table change feed via Supabase Realtime (or PowerSync if needed) | Offline queue and live updates |
| Push | Expo Notifications (APNs/FCM) + Web Push | One API across platforms |
| Analytics | PostHog | Product metrics and funnels |
| Crash reporting | Sentry | All platforms |

Alternative considered: **Flutter**. Also a good fit. Expo is chosen because the web version and the shared TypeScript code with the backend are simpler.

## 9. Data model (draft)

```
users            (id, name, email, home_tz, day_start_hour, created_at)
habits           (id, user_id, name, icon, color, kind[check|count|duration],
                  target_value, schedule_json, reminder_times[], archived_at,
                  created_at, updated_at)
habit_events     (id, habit_id, user_id, local_date, value, type[complete|undo],
                  device_id, created_at)
focus_sessions   (id, user_id, tag, habit_id?, planned_min, started_at,
                  ended_at?, paused_intervals_json, status[active|done|given_up],
                  species_id, device_id)
streak_freezes   (id, user_id, earned_at, used_on_date?)
world_unlocks    (id, user_id, unlock_key, unlocked_at)
species          (id, name, rarity, min_session_min, dew_cost, biome)
wallet           (user_id, dew_balance)            -- derived + cached
devices          (id, user_id, platform, push_token, last_active_at)
```

Streaks, daily scores and plant growth stages are **calculated** from `habit_events` and `focus_sessions` and cached. They are never the source of truth.

## 10. Non-functional requirements

| Area | Target |
|---|---|
| Performance | Cold start < 2 s on mid-range Android; Today screen interactive < 1 s |
| Timer accuracy | Drift under 1 s over 2 h; correct after app is killed and reopened |
| Offline | 100% of core actions work offline |
| Reliability | No completion or session is ever lost (event log + retry queue) |
| Accessibility | WCAG 2.1 AA; screen reader labels; heatmap has a text/list alternative; colorblind-safe palettes |
| Privacy | Minimal data collected; GDPR-style export and delete; no selling of data |
| Security | Row-level security in Postgres: users can only access their own rows |
| Localization | English at launch; strings ready for translation (Hindi next) |
| Battery | Timer uses scheduled notifications, not a constant background process |

## 11. Success metrics

| Metric | Target (3 months after launch) |
|---|---|
| Day-1 / Day-7 / Day-30 retention | 50% / 30% / 18% |
| Median global streak of active users | ≥ 5 days |
| Focus sessions per weekly active user | ≥ 6 |
| % of users on 2+ devices | ≥ 25% |
| Session completion rate (not given up) | ≥ 80% |
| Sync failure rate | < 0.1% of events |

## 12. Release plan

### Phase 0 — Foundations (weeks 1–2)
Repo setup, Expo + web project, Supabase schema, auth, local SQLite, basic sync.

### Phase 1 — MVP (weeks 3–8)
- Habits (check, count), schedules, reminders, Today screen.
- Per-habit and global streaks, heatmap.
- Pomodoro timer with cross-device live sync and notifications.
- Island v1: Meadow biome, 8 species, growth stages, 7/30-day unlocks.
- Onboarding, data export, account deletion.
- Platforms: Android, iOS, Web (PWA).

### Phase 2 — Polish (weeks 9–12)
Rain Days (streak freezes), duration habits, widgets, ambient sounds, Stay Focused mode, more biomes, share image, desktop app via Tauri.

### Phase 3 — Growth (later)
Friends and shared "group islands", timelapse video, watch apps, integrations (Google Calendar, Todoist), optional premium tier (extra biomes/themes, advanced stats — core features stay free).

## 13. Monetization (proposal)
- **Free**: all core habits, streaks, timer, sync, Meadow + 1 extra biome.
- **Istel Plus** (optional subscription): all biomes and species packs, advanced stats, timelapse export, custom themes.
- Never sell streak freezes or anything that "buys" progress. Progress must come from real effort.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Timer/notifications unreliable on some Android phones (battery optimisation) | Timestamp-based timer, scheduled local notifications, in-app guide to turn off battery optimisation |
| Sync conflicts cause lost or doubled completions | Event-based model with unique IDs; server de-duplicates |
| World art takes too long to make | Start with a small, modular sprite set; add species over time |
| Streak pressure causes stress and quitting | Rain Days, soft world decay (nothing dies), "best streak" always shown |
| Cheating by changing device time | Server timestamps for sessions when online; back-fill limit of 2 days |
| Looks too similar to Forest | Distinct mechanics (one evolving ecosystem, watering by habits, no deaths), original art style and naming |

## 15. Open questions
1. Final product name? "Istel" is a working title.
2. 2D isometric vs. light 3D for the world long-term?
3. Should "Stay Focused" mode be on by default or opt-in?
4. Should friends be able to visit each other's islands in v2?
5. Is a partnership for planting real trees worth exploring later?

## 16. Glossary
- **Qualifying action**: at least 1 habit completed or 1 focus session of 25+ minutes in a day.
- **Rain Day**: a streak freeze that protects the global streak for one missed day.
- **Dew drops**: in-app currency earned from focus minutes and habits, used to unlock species.
- **Island**: the user's living world that shows long-term progress.
