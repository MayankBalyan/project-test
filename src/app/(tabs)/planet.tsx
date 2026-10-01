import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Hero } from '@/components/hero';
import { Blob, Moon } from '@/components/ink-art';
import { PlanetWorld } from '@/components/planet-world';
import { Card, Screen, SectionTitle, Txt } from '@/components/ui';
import { Fonts, Gutter, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { islandTier, MOON_NAME, MOON_STAGE, nextUnlock, STREAK_UNLOCKS, treesFor, unlocksFor, WATERINGS_TO_MATURE } from '@/core/world';
import { usePalette } from '@/hooks/use-palette';
import { useIstel } from '@/state/store';

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function Stat({ value, label }: { value: string; label: string }) {
  const palette = usePalette();
  return (
    <Card style={styles.stat}>
      <Txt style={[styles.statValue, { color: palette.ink }]}>{value}</Txt>
      <Txt variant="caption" tone="inkSoft">
        {label}
      </Txt>
    </Card>
  );
}

export default function PlanetScreen() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const { plants, global, lifetimeFocusMinutes, settings, sessions } = useIstel();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plants.find((p) => p.id === selectedId);
  const session = selected ? sessions.find((s) => s.id === selected.sessionId) : undefined;
  const unlocks = unlocksFor(global.longest);
  const next = nextUnlock(global.longest);
  const tier = islandTier(lifetimeFocusMinutes);
  const mature = plants.filter((p) => p.stage === 'mature').length;
  const wilted = plants.filter((p) => p.stage === 'wilted').length;

  return (
    <Screen>
      <Hero
        title={'Your\nplanet'}
        subtitle={`${settings.islandName} · every focus session adds a moon, every habit day lights it up.`}
        art={
          <>
            <Blob size={140} variant={2} stars={16} style={styles.heroBlob} />
            <Moon size={70} style={styles.heroPlanet} />
          </>
        }
      />

      <PlanetWorld
        plants={plants}
        tier={tier}
        stars={20 + global.current * 2}
        unlocks={unlocks}
        selectedId={selectedId ?? undefined}
        onPlantPress={(id) => setSelectedId((cur) => (cur === id ? null : id))}
        width={Math.max(0, Math.min(width, MaxContentWidth) - Gutter * 2)}
      />

      {selected && session ? (
        <Card style={styles.plantCard}>
          <View style={styles.plantHead}>
            <Txt variant="section">{capitalize(MOON_NAME[selected.species].one.replace(/^an? /, ''))}</Txt>
            <Txt variant="label" tone="inkSoft">
              {MOON_STAGE[selected.stage]}
            </Txt>
          </View>
          <Txt variant="caption">
            Made {formatDay(selected.plantedOn)} by a {session.minutes}-minute {session.tag} session
            {treesFor(session.minutes) > 1 && session.status === 'done' ? `, one of its ${treesFor(session.minutes)} moons` : ''}.
          </Txt>
          <Txt variant="caption" tone="inkSoft">
            {selected.stage === 'wilted'
              ? 'That session was given up, so this moon went dark. Finish your next session to bring it back.'
              : selected.stage === 'mature'
                ? 'Fully lit.'
                : `Lit on ${selected.waterings} of ${WATERINGS_TO_MATURE} habit days. Do a habit to light it up.`}
          </Txt>
        </Card>
      ) : plants.length > 0 ? (
        <Txt variant="caption" tone="muted" style={styles.emptyNote}>
          Tap a moon to see which session made it.
        </Txt>
      ) : null}

      {plants.length === 0 && (
        <Txt variant="bodyBold" tone="inkSoft" style={styles.emptyNote}>
          No moons yet. Finish a focus session to put your first moon in orbit.
        </Txt>
      )}

      <View style={styles.stats}>
        <Stat value={String(plants.length)} label="Moons" />
        <Stat value={String(mature)} label="Full moons" />
        <Stat value={String(wilted)} label="Dark moons" />
        <Stat value={`${Math.floor(lifetimeFocusMinutes / 60)}h`} label={`Focus · size ${tier + 1}/6`} />
      </View>

      {next && (
        <Card style={styles.next}>
          <SectionTitle>Next unlock</SectionTitle>
          <Txt variant="bodyBold">
            {next.label} at a {next.days}-day streak
          </Txt>
          <View style={[styles.track, { borderColor: palette.ink }]}>
            <View
              style={[styles.bar, { backgroundColor: palette.ink, width: `${Math.min(100, (global.current / next.days) * 100)}%` }]}
            />
          </View>
          <Txt variant="caption" tone="inkSoft">
            {global.current} of {next.days} days
          </Txt>
        </Card>
      )}

      <View style={styles.unlocks}>
        <SectionTitle>Discoveries</SectionTitle>
        {STREAK_UNLOCKS.map((u) => {
          const on = unlocks.includes(u.key);
          return (
            <View key={u.key} style={[styles.unlockRow, { borderColor: palette.line }]}>
              <Txt variant="label" tone={on ? 'ink' : 'muted'}>
                {u.label}
              </Txt>
              <Txt variant="caption" tone={on ? 'ink' : 'muted'}>
                {on ? 'Unlocked' : `${u.days}-day streak`}
              </Txt>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlob: { position: 'absolute', right: -30, top: 10 },
  heroPlanet: { position: 'absolute', right: 70, top: 0 },
  emptyNote: { textAlign: 'center' },
  plantCard: { gap: Spacing.one + 2 },
  plantHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: { flexGrow: 1, flexBasis: 140, gap: 2, borderRadius: Radius.card - 6 },
  statValue: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 40 },
  next: { gap: Spacing.two },
  track: { height: 14, borderWidth: 2, borderRadius: Radius.pill, overflow: 'hidden' },
  bar: { height: '100%' },
  unlocks: { gap: Spacing.one },
  unlockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
