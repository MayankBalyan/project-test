import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Heading3D } from '@/components/heading-3d';
import { Blob, Moon, Planet } from '@/components/ink-art';
import { PlanetWorld } from '@/components/planet-world';
import { Card, InkButton, Screen, TextField, Txt } from '@/components/ui';
import { Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { HABIT_NAME_MAX, validateHabit } from '@/core/habit-input';
import { ISLAND_NAME_MAX, MAX_STARTER_PICKS, STARTER_HABITS } from '@/core/starters';
import { moonsFor } from '@/core/world';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { useIstel } from '@/state/store';

type Use = 'both' | 'focus';

const USES: { value: Use; title: string; note: string }[] = [
  { value: 'both', title: 'Habits + focus', note: 'Track daily habits and fill your planet’s sky with moons from focus sessions.' },
  { value: 'focus', title: 'Just focus', note: 'Only the focus timer and your planet. Turn habits on later in Settings.' },
];

const FOCUS_OPTIONS = [
  { minutes: 25, note: 'A good start. Adds a grey moon.' },
  { minutes: 50, note: 'Deep work. Grows a pine.' },
  { minutes: 90, note: 'Long haul. Adds 3 rare ringed moons (one per half hour).' },
];

function Check({ on }: { on: boolean }) {
  const palette = usePalette();
  return (
    <View style={[styles.check, { borderColor: palette.ink, backgroundColor: on ? palette.ink : 'transparent' }]}>
      {on && (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="M4 12.5l5 5L20 6.5" stroke={palette.paper} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        </Svg>
      )}
    </View>
  );
}

function Option({
  title,
  note,
  selected,
  disabled,
  role,
  trailing,
  onPress,
}: {
  title: string;
  note: string;
  selected: boolean;
  disabled?: boolean;
  role: 'checkbox' | 'radio';
  /** Shown at the right edge, e.g. a remove hint on picked habits. */
  trailing?: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      role={role}
      aria-checked={selected}
      aria-label={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: palette.ink,
          backgroundColor: palette.surface,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      <Check on={selected} />
      <View style={styles.optionText}>
        <Txt variant="label" style={styles.optionTitle}>
          {title}
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          {note}
        </Txt>
      </View>
      {trailing && <Txt variant="label">{trailing}</Txt>}
    </Pressable>
  );
}

function Steps({ step, total }: { step: number; total: number }) {
  const palette = usePalette();
  return (
    <View style={styles.steps} aria-label={`Step ${step + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.stepDot, { borderColor: palette.ink, backgroundColor: i <= step ? palette.ink : 'transparent' }]} />
      ))}
      <Txt variant="label" tone="inkSoft">
        {step + 1} / {total}
      </Txt>
    </View>
  );
}

export default function WelcomeScreen() {
  const wide = useIsWide();
  const { width } = useWindowDimensions();
  const { habitActions, updateSettings, settings } = useIstel();
  const [step, setStep] = useState(0);
  const [use, setUse] = useState<Use>('both');
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [minutes, setMinutes] = useState(settings.focusMinutes);
  const [islandName, setIslandName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const customName = custom.trim();
  const picks = picked.length + (customName ? 1 : 0);
  const headingSize = wide ? 96 : 58;
  const steps =
    use === 'focus' ? (['use', 'focus', 'planet'] as const) : (['use', 'habits', 'focus', 'planet'] as const);
  const current = steps[step];

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const next = () => {
    if (current === 'habits' && customName) {
      const problem = validateHabit({ name: customName, kind: 'check', target: 1, schedule: { type: 'daily' } });
      if (problem) return setError(problem);
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const finish = (withChoices: boolean) => {
    if (withChoices && use === 'both') {
      for (const s of STARTER_HABITS) if (picked.includes(s.id)) habitActions.add(s.input);
      if (customName) habitActions.add({ name: customName, kind: 'check', target: 1, schedule: { type: 'daily' } });
    }
    updateSettings({
      onboarded: true,
      habitsEnabled: !withChoices || use === 'both',
      focusMinutes: minutes,
      islandName: islandName.trim() || settings.islandName,
    });
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Steps step={step} total={steps.length} />
        {step === 0 && (
          <Pressable role="button" onPress={() => finish(false)} hitSlop={12}>
            <Txt variant="label">Skip</Txt>
          </Pressable>
        )}
        {step > 0 && (
          <Pressable role="button" onPress={() => setStep((s) => s - 1)} hitSlop={12}>
            <Txt variant="label">← Back</Txt>
          </Pressable>
        )}
      </View>

      {current === 'use' && (
        <>
          <View style={styles.hero}>
            <Blob size={150} variant={2} stars={20} style={styles.blob} />
            <Heading3D size={headingSize}>{'How will you\nuse Istel?'}</Heading3D>
          </View>
          <Txt variant="bodyBold" tone="inkSoft">
            Every focus session adds moons to your planet either way. You can change this any time in Settings.
          </Txt>
          <View style={styles.options} role="radiogroup">
            {USES.map((u) => (
              <Option
                key={u.value}
                role="radio"
                title={u.title}
                note={u.note}
                selected={use === u.value}
                onPress={() => setUse(u.value)}
              />
            ))}
          </View>
          <InkButton label="Next" onPress={next} />
        </>
      )}

      {current === 'habits' && (
        <>
          <View style={styles.hero}>
            <Blob size={150} variant={1} stars={20} style={styles.blob} />
            <Planet size={100} style={styles.planet} />
            <Heading3D size={headingSize}>{'Pick your\nfirst habits'}</Heading3D>
          </View>
          <Txt variant="bodyBold" tone="inkSoft">
            Optional. Pick up to {MAX_STARTER_PICKS}, tap a picked one again to remove it, or skip and add habits later.
          </Txt>
          <View style={styles.options}>
            {STARTER_HABITS.map((s) => {
              const on = picked.includes(s.id);
              return (
                <Option
                  key={s.id}
                  role="checkbox"
                  title={s.input.name}
                  note={s.note}
                  selected={on}
                  trailing={on ? '✕ Remove' : undefined}
                  disabled={!on && picks >= MAX_STARTER_PICKS}
                  onPress={() => toggle(s.id)}
                />
              );
            })}
          </View>
          <TextField
            label="Or write your own"
            value={custom}
            onChangeText={setCustom}
            placeholder="e.g. Practice guitar"
            maxLength={HABIT_NAME_MAX}
            editable={!!customName || picks < MAX_STARTER_PICKS}
          />
          {picks > 0 && (
            <Pressable
              role="button"
              onPress={() => {
                setPicked([]);
                setCustom('');
              }}
              hitSlop={8}
              style={styles.clear}>
              <Txt variant="label">✕ Clear all picks</Txt>
            </Pressable>
          )}
          {error && (
            <Txt variant="bodyBold" role="alert">
              ✦ {error}
            </Txt>
          )}
          <InkButton
            label={picks ? `Next · ${picks} picked` : 'Skip for now'}
            kind={picks ? 'primary' : 'outline'}
            onPress={next}
          />
          <Txt variant="caption" tone="muted" style={styles.center}>
            You can change, add or remove habits any time.
          </Txt>
        </>
      )}

      {current === 'focus' && (
        <>
          <View style={styles.hero}>
            <Blob size={150} variant={0} stars={20} style={styles.blob} />
            <Moon size={70} style={styles.moon} />
            <Heading3D size={headingSize}>{'Pick your\nfocus'}</Heading3D>
          </View>
          <Txt variant="bodyBold" tone="inkSoft">
            Each finished focus session puts moons around your planet. Longer sessions make bigger moons, and every half hour adds one more.
          </Txt>
          <View style={styles.options}>
            {FOCUS_OPTIONS.map((o) => (
              <Option
                key={o.minutes}
                role="radio"
                title={`${o.minutes} minutes`}
                note={o.note}
                selected={minutes === o.minutes}
                onPress={() => setMinutes(o.minutes)}
              />
            ))}
          </View>
          <InkButton label="Next" onPress={next} />
        </>
      )}

      {current === 'planet' && (
        <>
          <View style={styles.hero}>
            <Heading3D size={headingSize}>{'Name your\nplanet'}</Heading3D>
          </View>
          <PlanetWorld
            plants={[]}
            tier={0}
            stars={24}
            unlocks={[]}
            width={Math.max(0, Math.min(width, MaxContentWidth) - Gutter * 2)}
          />
          <TextField
            label="Planet name"
            value={islandName}
            onChangeText={setIslandName}
            placeholder={settings.islandName}
            maxLength={ISLAND_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={() => finish(true)}
          />
          <Card style={styles.summary}>
            <Txt variant="label" tone="inkSoft">
              Your start
            </Txt>
            <Txt variant="caption">
              {use === 'focus' ? 'Just focus' : picks ? `${picks} habit${picks > 1 ? 's' : ''}` : 'No habits yet'} ·{' '}
              {minutes}-minute focus (adds {moonsFor(minutes)})
            </Txt>
          </Card>
          <InkButton label="Start orbiting" onPress={() => finish(true)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  hero: { minHeight: 150, justifyContent: 'flex-end' },
  blob: { position: 'absolute', right: -50, top: -30 },
  planet: { position: 'absolute', right: -6, top: -24 },
  moon: { position: 'absolute', right: 110, top: 0 },
  options: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 2,
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 17 },
  summary: { gap: Spacing.one },
  clear: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  center: { textAlign: 'center' },
});
