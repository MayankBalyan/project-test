import { randomUUID } from 'expo-crypto';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { addDays, daysBetween, DEFAULT_DAY_START_HOUR, LocalDate, toLocalDate } from '@/core/dates';
import { HabitInput, normalizeHabit } from '@/core/habit-input';
import { dailyValues, Habit, HabitEvent, habitStreak, isDoneOn, isScheduledOn } from '@/core/habits';
import { DayActivity, dailyScore, isQualifyingDay } from '@/core/score';
import { globalStreak } from '@/core/streaks';
import {
  elapsedMs,
  endsAt,
  leftTooLong,
  pause,
  plannedEndAt,
  resume,
  startTimer,
  STOPWATCH_CAP_MINUTES,
  TimerState,
} from '@/core/timer';
import { planNotifications } from '@/core/notify-plan';
import { FocusSessionRecord, growPlants } from '@/core/world';

import { applyPlan } from '@/lib/notifications';

import { load, save } from './persist';

export type NamedHabit = Habit & { name: string; archivedAt?: number; reminders?: string[] };
export type TaggedSession = FocusSessionRecord & { tag: string; habitId?: string };
/** `habitId` links the session to a duration habit, which gets the focused minutes when it finishes. */
export type ActiveFocus = {
  timer: TimerState;
  minutes: number;
  tag: string;
  habitId?: string;
  /** Countdown (default) or a stopwatch that counts up until stopped. */
  mode?: FocusMode;
};
export type FocusMode = 'timer' | 'stopwatch';

export type Settings = {
  /** False until the first-launch setup is finished or skipped. */
  onboarded: boolean;
  islandName: string;
  /** Default focus length in minutes. */
  focusMinutes: number;
  /** Hour (0–23) when a new day starts. */
  dayStartHour: number;
  /** Leaving the app for more than a few seconds during a session wilts it. */
  stayFocused: boolean;
  notifications: {
    /** Evening nudge when nothing has counted toward the streak yet today. */
    streakAtRisk: boolean;
    streakAtRiskHour: number;
    focusEnd: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  islandName: 'My island',
  focusMinutes: 25,
  dayStartHour: DEFAULT_DAY_START_HOUR,
  stayFocused: false,
  notifications: { streakAtRisk: true, streakAtRiskHour: 20, focusEnd: true },
};

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function useToday(dayStartHour: number): LocalDate {
  const config = useMemo(() => ({ timeZone, dayStartHour }), [dayStartHour]);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(() => toLocalDate(new Date(tick), config), [tick, config]);
}

/** Re-renders every `ms` while `active`; returns the current time. */
export function useNow(active: boolean, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

function useRootlineState() {
  const [habits, setHabits] = useState<NamedHabit[]>(() => load('habits', []));
  const [events, setEvents] = useState<HabitEvent[]>(() => load('events', []));
  const [sessions, setSessions] = useState<TaggedSession[]>(() => load('sessions', []));
  const [focus, setFocus] = useState<ActiveFocus | null>(() => load('focus', null));
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    // People who used the app before onboarding existed skip it.
    onboarded: habits.length > 0 || sessions.length > 0,
    ...load<Partial<Settings>>('settings', {}),
  }));
  const today = useToday(settings.dayStartHour);
  /** Set when Stay Focused ended a session because the app was left; shown on the Focus screen. */
  const [interruption, setInterruption] = useState<{ awaySeconds: number } | null>(null);
  const dayConfig = useMemo(() => ({ timeZone, dayStartHour: settings.dayStartHour }), [settings.dayStartHour]);

  useEffect(() => save('settings', settings), [settings]);
  useEffect(() => save('habits', habits), [habits]);
  useEffect(() => save('events', events), [events]);
  useEffect(() => save('sessions', sessions), [sessions]);
  useEffect(() => save('focus', focus), [focus]);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archivedAt), [habits]);

  const habitActions = useMemo(
    () => ({
      add: (input: HabitInput) => {
        const id = randomUUID();
        setHabits((prev) => [...prev, { id, ...normalizeHabit(input), createdOn: today }]);
        return id;
      },
      update: (id: string, input: HabitInput) =>
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...normalizeHabit(input) } : h))),
      setArchived: (id: string, archived: boolean) =>
        setHabits((prev) =>
          prev.map((h) => (h.id === id ? { ...h, archivedAt: archived ? Date.now() : undefined } : h)),
        ),
      /** Deletes the habit and its whole history. */
      remove: (id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        setEvents((prev) => prev.filter((e) => e.habitId !== id));
      },
    }),
    [today],
  );

  const values = useMemo(() => {
    const byHabit = new Map<string, Map<LocalDate, number>>();
    for (const h of habits) byHabit.set(h.id, dailyValues(events.filter((e) => e.habitId === h.id)));
    return byHabit;
  }, [habits, events]);

  const toggleHabit = useCallback(
    (habitId: string) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const current = values.get(habitId)?.get(today) ?? 0;
      const base = { id: randomUUID(), habitId, date: today, createdAt: Date.now() };
      const event: HabitEvent =
        habit.kind === 'count' && current < habit.target
          ? { ...base, type: 'complete', value: 1 }
          : current >= habit.target
            ? { ...base, type: 'undo', value: current }
            : { ...base, type: 'complete', value: habit.target - current };
      setEvents((prev) => [...prev, event]);
    },
    [habits, values, today],
  );

  const endFocus = useCallback(
    (status: 'done' | 'given_up') => {
      if (!focus) return;
      // A session that ended while the app was closed is recorded at the moment it actually ended.
      const at = Math.min(Date.now(), plannedEndAt(focus.timer) ?? Date.now());
      const date = toLocalDate(new Date(at), dayConfig);
      const minutes = Math.floor(elapsedMs(focus.timer, at) / 60_000);
      setFocus(null);
      // A stopwatch stopped within the first minute is simply discarded.
      if (status === 'done' && minutes === 0) return;
      setSessions((prev) => [
        ...prev,
        { id: randomUUID(), date, minutes, status, createdAt: at, tag: focus.tag, habitId: focus.habitId },
      ]);
      if (status === 'done' && focus.habitId && minutes > 0) {
        const habitId = focus.habitId;
        setEvents((prev) => [...prev, { id: randomUUID(), habitId, date, type: 'complete', value: minutes, createdAt: at }]);
      }
    },
    [focus, dayConfig],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch })), []);

  /** Removes every habit, check-in, session and setting on this device and starts over. */
  const eraseAll = useCallback(() => {
    setHabits([]);
    setEvents([]);
    setSessions([]);
    setFocus(null);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const focusActions = useMemo(
    () => ({
      start: (minutes: number, tag: string, habitId?: string, mode: FocusMode = 'timer') => {
        const length = mode === 'stopwatch' ? STOPWATCH_CAP_MINUTES : minutes;
        setInterruption(null);
        setFocus({ timer: startTimer(Date.now(), length), minutes: length, tag, habitId, mode });
      },
      pause: () => setFocus((f) => f && { ...f, timer: pause(f.timer, Date.now()) }),
      resume: () => setFocus((f) => f && { ...f, timer: resume(f.timer, Date.now()) }),
      giveUp: () => endFocus('given_up'),
      complete: () => endFocus('done'),
    }),
    [endFocus],
  );

  // Stay Focused: leaving the app for too long during a session gives it up (the plant wilts).
  const leftAt = useRef<number | null>(null);
  useEffect(() => {
    if (!settings.stayFocused || !focus) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftAt.current = Date.now();
      } else if (state === 'active' && leftAt.current !== null) {
        const away = Date.now() - leftAt.current;
        const broke = leftTooLong(focus.timer, leftAt.current, Date.now());
        leftAt.current = null;
        if (broke) {
          setInterruption({ awaySeconds: Math.round(away / 1000) });
          endFocus('given_up');
        }
      }
    });
    return () => sub.remove();
  }, [settings.stayFocused, focus, endFocus]);

  // Record the session as soon as the countdown reaches zero.
  useEffect(() => {
    if (!focus) return;
    const now = Date.now();
    const end = endsAt(focus.timer, now);
    if (end === null) return;
    const id = setTimeout(() => endFocus('done'), end - now);
    return () => clearTimeout(id);
  }, [focus, endFocus]);

  const derived = useMemo(() => {
    const focusByDay = new Map<LocalDate, { minutes: number; longest: number }>();
    for (const s of sessions) {
      if (s.status !== 'done') continue;
      const d = focusByDay.get(s.date) ?? { minutes: 0, longest: 0 };
      focusByDay.set(s.date, { minutes: d.minutes + s.minutes, longest: Math.max(d.longest, s.minutes) });
    }

    const activityOn = (date: LocalDate): DayActivity => {
      let scheduled = 0;
      let completed = 0;
      for (const h of habits) {
        // Past completions of archived habits still count; only active habits can be missed.
        const exists = !h.archivedAt && daysBetween(h.createdOn, date) >= 0;
        if (exists && isScheduledOn(h.schedule, date) && h.schedule.type !== 'timesPerWeek') scheduled++;
        if (isDoneOn(h, values.get(h.id)!, date)) completed++;
      }
      const f = focusByDay.get(date);
      return {
        habitsScheduled: Math.max(scheduled, completed),
        habitsCompleted: completed,
        focusMinutes: f?.minutes ?? 0,
        longestSessionMinutes: f?.longest ?? 0,
      };
    };

    const days: { date: LocalDate; activity: DayActivity; score: number }[] = [];
    for (let back = 364; back >= 0; back--) {
      const date = addDays(today, -back);
      const activity = activityOn(date);
      days.push({ date, activity, score: dailyScore(activity) });
    }

    const activeDates = days.filter((d) => isQualifyingDay(d.activity)).map((d) => d.date);
    const wateredDays = days.filter((d) => d.activity.habitsCompleted > 0).map((d) => d.date);

    return {
      days,
      todayActivity: days[days.length - 1],
      global: globalStreak(activeDates, today),
      habitStats: activeHabits.map((h) => ({
        habit: h,
        value: values.get(h.id)?.get(today) ?? 0,
        done: isDoneOn(h, values.get(h.id)!, today),
        scheduledToday: isScheduledOn(h.schedule, today),
        streak: habitStreak(h, events.filter((e) => e.habitId === h.id), today),
      })),
      plants: growPlants(sessions, wateredDays),
      lifetimeFocusMinutes: sessions.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.minutes, 0),
      sessionsToday: sessions.filter((s) => s.date === today && s.status === 'done'),
    };
  }, [habits, activeHabits, values, events, sessions, today]);

  // Re-plan notifications whenever something they depend on changes (and on launch).
  const [notificationsVersion, setNotificationsVersion] = useState(0);
  const refreshNotifications = useCallback(() => setNotificationsVersion((v) => v + 1), []);
  useEffect(() => {
    const id = setTimeout(() => {
      const plan = planNotifications({
        now: Date.now(),
        today,
        dayConfig,
        habits,
        doneToday: new Set(derived.habitStats.filter((h) => h.done).map((h) => h.habit.id)),
        qualifiedToday: isQualifyingDay(derived.todayActivity.activity),
        currentStreak: derived.global.current,
        streakAtRisk: { enabled: settings.notifications.streakAtRisk, hour: settings.notifications.streakAtRiskHour },
        focusEnd: {
          enabled: settings.notifications.focusEnd && focus?.mode !== 'stopwatch',
          at: focus ? plannedEndAt(focus.timer) : null,
        },
      });
      applyPlan(plan).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [today, dayConfig, habits, derived, settings.notifications, focus, notificationsVersion]);

  return {
    today,
    refreshNotifications,
    interruption,
    clearInterruption: () => setInterruption(null),
    habits,
    sessions,
    focus,
    events,
    settings,
    updateSettings,
    eraseAll,
    toggleHabit,
    habitActions,
    focusActions,
    ...derived,
  };
}

type RootlineState = ReturnType<typeof useRootlineState>;
const RootlineContext = createContext<RootlineState | null>(null);

export function RootlineProvider({ children }: { children: ReactNode }) {
  const state = useRootlineState();
  return <RootlineContext.Provider value={state}>{children}</RootlineContext.Provider>;
}

export function useRootline() {
  const ctx = useContext(RootlineContext);
  if (!ctx) throw new Error('useRootline must be used inside RootlineProvider');
  return ctx;
}
