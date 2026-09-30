import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Heading3D } from '@/components/heading-3d';
import { Hero } from '@/components/hero';
import { Blob, Moon } from '@/components/ink-art';
import { Card, Chip, InkButton, Screen, SectionTitle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { canPause, formatRemaining, isPaused, MAX_PAUSES, remainingMs } from '@/core/timer';
import { speciesFor } from '@/core/world';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { useNow, useRootline } from '@/state/store';

const PRESETS = [10, 25, 50, 90];
const TAGS = ['Study', 'Work', 'Reading'];
const SPECIES_NAME = { flower: 'a flower', shrub: 'a shrub', sapling: 'a sapling', pine: 'a pine', oak: 'a rare oak' };

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
  const { focus, focusActions, sessionsToday, settings, habitStats } = useRootline();
  const durationHabits = habitStats.filter((h) => h.habit.kind === 'duration');
  const initial = durationHabits.find((h) => h.habit.id === initialHabitId);
  const leftFor = (h: (typeof durationHabits)[number]) => Math.max(5, Math.ceil((h.habit.target - h.value) / 5) * 5);
  const [habitId, setHabitId] = useState<string | undefined>(initial?.habit.id);
  const [minutes, setMinutes] = useState(initial && !initial.done ? leftFor(initial) : settings.focusMinutes);
  const [tag, setTag] = useState(TAGS[0]);
  const now = useNow(!!focus);
  const linked = durationHabits.find((h) => h.habit.id === (focus ? focus.habitId : habitId));
  const presets = [...new Set([...PRESETS, minutes])].sort((a, b) => a - b);

  const planned = focus ? focus.minutes : minutes;
  const remaining = focus ? remainingMs(focus.timer, now) : planned * 60_000;
  const progress = focus ? 1 - remaining / focus.timer.plannedMs : 0;
  const paused = focus ? isPaused(focus.timer) : false;
  const pausesLeft = focus ? MAX_PAUSES - focus.timer.pauses.length : MAX_PAUSES;
  const focusedToday = sessionsToday.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <Screen>
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
        <TimerRing size={wide ? 340 : 300} progress={progress}>
          <Heading3D size={wide ? 84 : 72} depth={6} align="center">
            {formatRemaining(remaining)}
          </Heading3D>
          <Txt variant="label" tone="inkSoft">
            {focus ? (paused ? 'Paused' : (linked?.habit.name ?? focus.tag)) : `Plants ${SPECIES_NAME[speciesFor(planned)]}`}
          </Txt>
          {linked && (
            <Txt variant="caption" tone="inkSoft">
              {linked.value}/{linked.habit.target} min today
            </Txt>
          )}
        </TimerRing>
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
          <InkButton label="Give up" kind="outline" onPress={focusActions.giveUp} />
          <Txt variant="caption" tone="muted" style={styles.note}>
            Giving up leaves a wilted sprout. Finish your next session to bring it back.
          </Txt>
        </View>
      ) : (
        <Card style={styles.setup}>
          <SectionTitle>Length</SectionTitle>
          <View style={styles.chips}>
            {presets.map((m) => (
              <Chip key={m} label={`${m} min`} selected={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </View>
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
          <InkButton label="Start focus" onPress={() => focusActions.start(minutes, tag, habitId)} style={styles.start} />
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  start: { marginTop: Spacing.one },
  today: { alignItems: 'center' },
});
