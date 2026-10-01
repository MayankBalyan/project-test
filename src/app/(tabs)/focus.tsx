import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { PhoneTopBar } from '@/components/account-button';
import { Heading3D } from '@/components/heading-3d';
import { Hero } from '@/components/hero';
import { FocusDial } from '@/components/focus-dial';
import { Blob, Moon } from '@/components/ink-art';
import { Card, Chip, InkButton, Screen, SectionTitle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  canPause,
  elapsedMs,
  formatRemaining,
  isPaused,
  MAX_PAUSES,
  remainingMs,
  STOPWATCH_CAP_MINUTES,
} from '@/core/timer';
import { clampFocusMinutes, Species, speciesFor, treesFor } from '@/core/world';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { FocusMode, useNow, useIstel } from '@/state/store';

const QUICK_PICKS = [25, 50, 90, 120, 180];
const TAGS = ['Study', 'Work', 'Reading'];
const SPECIES_NAME: Record<Species, [string, string]> = {
  flower: ['a flower', 'flowers'],
  shrub: ['a shrub', 'shrubs'],
  sapling: ['a sapling', 'saplings'],
  pine: ['a pine', 'pines'],
  oak: ['a rare oak', 'rare oaks'],
};

/** "a shrub", "3 rare oaks": what a session of this length plants. */
function plantsFor(minutes: number) {
  const n = treesFor(minutes);
  const [one, many] = SPECIES_NAME[speciesFor(minutes)];
  return n === 1 ? one : `${n} ${many}`;
}

function TimerRing({ progress, size, children }: { progress: number; size: number; children: React.ReactNode }) {
  const palette = usePalette();
  const r = size / 2 - 14;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.line} strokeWidth={10} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={palette.ink}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const inner = r - (i % 5 === 0 ? 22 : 16);
          return (
            <Line
              key={i}
              x1={size / 2 + Math.cos(a) * inner}
              y1={size / 2 + Math.sin(a) * inner}
              x2={size / 2 + Math.cos(a) * (r - 12)}
              y2={size / 2 + Math.sin(a) * (r - 12)}
              stroke={palette.ink}
              strokeWidth={i % 5 === 0 ? 2 : 1}
            />
          );
        })}
      </Svg>
      {children}
    </View>
  );
}

export default function FocusScreen() {
  // `?habit=` comes from tapping a minutes habit on Today; remount so the choice resets to it.
  const { habit } = useLocalSearchParams<{ habit?: string }>();
  return <Focus key={habit ?? 'none'} initialHabitId={habit} />;
}

function Focus({ initialHabitId }: { initialHabitId?: string }) {
  const wide = useIsWide();
  const { focus, focusActions, sessionsToday, settings, habitStats, interruption, clearInterruption } = useIstel();
  const [mode, setMode] = useState<FocusMode>('timer');
  const durationHabits = habitStats.filter((h) => h.habit.kind === 'duration');
  const initial = durationHabits.find((h) => h.habit.id === initialHabitId);
  const leftFor = (h: (typeof durationHabits)[number]) => clampFocusMinutes(Math.ceil((h.habit.target - h.value) / 5) * 5);
  const [habitId, setHabitId] = useState<string | undefined>(initial?.habit.id);
  const [minutes, setMinutes] = useState(
    clampFocusMinutes(initial && !initial.done ? leftFor(initial) : settings.focusMinutes),
  );
  const [tag, setTag] = useState(TAGS[0]);
  const now = useNow(!!focus);
  const linked = durationHabits.find((h) => h.habit.id === (focus ? focus.habitId : habitId));

  const activeMode: FocusMode = focus ? (focus.mode ?? 'timer') : mode;
  const stopwatch = activeMode === 'stopwatch';
  const planned = focus ? focus.minutes : minutes;
  const remaining = focus ? remainingMs(focus.timer, now) : planned * 60_000;
  const elapsed = focus ? elapsedMs(focus.timer, now) : 0;
  const progress = stopwatch ? (elapsed % 3_600_000) / 3_600_000 : focus ? 1 - remaining / focus.timer.plannedMs : 0;
  const species = plantsFor(stopwatch ? Math.floor(elapsed / 60_000) : planned);
  const choosing = !focus && !stopwatch;
  const ringSize = wide ? 340 : 300;
  const display = formatRemaining(stopwatch ? Math.floor(elapsed / 1000) * 1000 : remaining);
  const paused = focus ? isPaused(focus.timer) : false;
  const pausesLeft = focus ? MAX_PAUSES - focus.timer.pauses.length : MAX_PAUSES;
  const focusedToday = sessionsToday.reduce((sum, s) => sum + s.minutes, 0);

  const ringInner = (
    <>
      <Heading3D size={(wide ? 84 : 72) * (display.length > 5 ? 0.85 : 1)} depth={6} align="center">
        {choosing ? String(minutes) : display}
      </Heading3D>
      {choosing && (
        <Txt variant="label" tone="inkSoft">
          minutes
        </Txt>
      )}
      <Txt variant="label" tone="inkSoft">
        {focus
          ? paused
            ? 'Paused'
            : stopwatch
              ? `Counting up · ${species} so far`
              : (linked?.habit.name ?? focus.tag)
          : stopwatch
            ? 'Stopwatch · stop when you’re done'
            : `Plants ${species}`}
      </Txt>
      {linked && (
        <Txt variant="caption" tone="inkSoft">
          {linked.value}/{linked.habit.target} min today
        </Txt>
      )}
    </>
  );

  return (
    <Screen>
      {/* With habits off, Focus is the home tab, so it carries the settings and account buttons. */}
      {!wide && !settings.habitsEnabled && <PhoneTopBar />}
      <Hero
        title={'Deep\nfocus'}
        subtitle="Stay with it. When the timer ends, a seed lands on your island."
        art={
          <>
            <Blob size={150} variant={0} stars={18} style={styles.heroBlob} />
            <Moon size={70} style={styles.heroMoon} />
          </>
        }
      />

      <View style={styles.center}>
        {choosing ? (
          <FocusDial size={ringSize} minutes={minutes} onChange={setMinutes}>
            {ringInner}
          </FocusDial>
        ) : (
          <TimerRing size={ringSize} progress={progress}>
            {ringInner}
          </TimerRing>
        )}
      </View>

      {focus ? (
        <View style={styles.actions}>
          {paused ? (
            <InkButton label="Resume" onPress={focusActions.resume} />
          ) : (
            <InkButton
              label={`Pause · ${pausesLeft} left`}
              onPress={focusActions.pause}
              disabled={!canPause(focus.timer, now)}
            />
          )}
          {stopwatch ? (
            <>
              <InkButton label="Stop · plant it" kind="outline" onPress={focusActions.complete} />
              <Txt variant="caption" tone="muted" style={styles.note}>
                Stops by itself after {STOPWATCH_CAP_MINUTES / 60} hours. Under a minute isn’t saved.
              </Txt>
            </>
          ) : (
            <>
              <InkButton label="Give up" kind="outline" onPress={focusActions.giveUp} />
              <Txt variant="caption" tone="muted" style={styles.note}>
                Giving up leaves a wilted sprout. Finish your next session to bring it back.
              </Txt>
            </>
          )}
          {settings.stayFocused && (
            <Txt variant="caption" tone="inkSoft" style={styles.note}>
              Stay Focused is on: leaving the app for more than 10 seconds wilts this session.
            </Txt>
          )}
        </View>
      ) : (
        <Card style={styles.setup}>
          {interruption && (
            <View style={styles.interruption} role="alert">
              <Txt variant="bodyBold">
                You left Istel for {interruption.awaySeconds}s, so that session wilted.
              </Txt>
              <Pressable role="button" onPress={clearInterruption} hitSlop={8}>
                <Txt variant="label">OK</Txt>
              </Pressable>
            </View>
          )}
          <SectionTitle>Mode</SectionTitle>
          <View style={styles.chips}>
            <Chip label="Timer" selected={mode === 'timer'} onPress={() => setMode('timer')} />
            <Chip label="Stopwatch" selected={mode === 'stopwatch'} onPress={() => setMode('stopwatch')} />
          </View>
          {mode === 'timer' && (
            <>
              <SectionTitle right={<Txt variant="bodyBold">{minutes} min</Txt>}>Length</SectionTitle>
              <Txt variant="caption" tone="inkSoft">
                Drag the dial from 10 minutes to 3 hours. Every half hour plants one more tree.
              </Txt>
              <View style={styles.chips}>
                {QUICK_PICKS.map((m) => (
                  <Chip
                    key={m}
                    label={m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h ${m % 60}` : `${m / 60}h`}
                    selected={minutes === m}
                    onPress={() => setMinutes(m)}
                  />
                ))}
              </View>
            </>
          )}
          {durationHabits.length > 0 && (
            <>
              <SectionTitle>Counts toward</SectionTitle>
              <View style={styles.chips}>
                <Chip label="Nothing" selected={!habitId} onPress={() => setHabitId(undefined)} />
                {durationHabits.map((h) => (
                  <Chip
                    key={h.habit.id}
                    label={h.habit.name}
                    selected={habitId === h.habit.id}
                    onPress={() => {
                      setHabitId(h.habit.id);
                      if (!h.done) setMinutes(leftFor(h));
                    }}
                  />
                ))}
              </View>
            </>
          )}
          <SectionTitle>Tag</SectionTitle>
          <View style={styles.chips}>
            {TAGS.map((t) => (
              <Chip key={t} label={t} selected={tag === t} onPress={() => setTag(t)} />
            ))}
          </View>
          <InkButton label="Start focus" onPress={() => focusActions.start(minutes, tag, habitId, mode)} style={styles.start} />
        </Card>
      )}

      <View style={styles.today}>
        <Txt variant="label" tone="inkSoft">
          Today · {sessionsToday.length} sessions · {focusedToday} min
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlob: { position: 'absolute', right: -40, top: 0 },
  heroMoon: { position: 'absolute', right: 110, top: 10 },
  center: { alignItems: 'center' },
  actions: { gap: Spacing.two + 2 },
  note: { textAlign: 'center' },
  setup: { gap: Spacing.three },
  interruption: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  start: { marginTop: Spacing.one },
  today: { alignItems: 'center' },
});
