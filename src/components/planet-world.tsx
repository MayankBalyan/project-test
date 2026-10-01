import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Rect, ClipPath } from 'react-native-svg';

import { Plant, PlantStage, Species, UnlockKey } from '@/core/world';
import { usePalette } from '@/hooks/use-palette';

import { seeded, Sparkle, Stars } from './ink-art';

const W = 360;
const H = 300;
const CX = W / 2;
const CY = 156;
/** Orbits are tilted ellipses; this squashes them so they read as rings seen from slightly above. */
const TILT = 0.34;
const ORBITS = 5;

type Ink = { face: string; ink: string };

/** Moon radius by session length (species ids are kept from the island days). */
const MOON_R: Record<Species, number> = { flower: 3.2, shrub: 4.4, sapling: 5.2, pine: 6.2, oak: 7.6 };

/**
 * One moon. Habit days light it up phase by phase: dust (dotted), crescent, half, full (with craters).
 * A given-up session leaves a dark moon.
 */
function Moon({ species, stage, x, y, c }: { species: Species; stage: PlantStage; x: number; y: number; c: Ink }) {
  const r = MOON_R[species];
  const edge = { stroke: c.face, strokeWidth: 1.2 };
  if (stage === 'seed') {
    return <Circle cx={x} cy={y} r={r} fill="none" stroke={c.face} strokeWidth={1.2} strokeDasharray="1.5 2" />;
  }
  if (stage === 'wilted') {
    return <Circle cx={x} cy={y} r={r} fill={c.ink} stroke={c.face} strokeWidth={1} strokeDasharray="2 1.5" opacity={0.8} />;
  }
  const ring =
    species === 'oak' ? (
      <Ellipse cx={x} cy={y} rx={r * 1.9} ry={r * 0.55} fill="none" stroke={c.face} strokeWidth={1.2} transform={`rotate(-18 ${x} ${y})`} />
    ) : null;
  if (stage === 'mature') {
    return (
      <G>
        {ring}
        <Circle cx={x} cy={y} r={r} fill={c.face} stroke={c.ink} strokeWidth={1.2} />
        {r > 4 && (
          <G fill="none" stroke={c.ink} strokeWidth={0.8}>
            <Circle cx={x - r * 0.35} cy={y - r * 0.3} r={r * 0.22} />
            <Circle cx={x + r * 0.3} cy={y + r * 0.25} r={r * 0.28} />
          </G>
        )}
      </G>
    );
  }
  // Crescent and half: a dark disc with the lit part on the right.
  const lit =
    stage === 'young'
      ? `M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} Z`
      : `M${x} ${y - r} A${r} ${r} 0 0 1 ${x} ${y + r} A${r * 0.45} ${r} 0 0 0 ${x} ${y - r} Z`;
  return (
    <G>
      {ring}
      <Circle cx={x} cy={y} r={r} fill={c.ink} {...edge} />
      <Path d={lit} fill={c.face} />
    </G>
  );
}

/**
 * The user's planet in space, with every focus session's moons on its orbits. Everything is derived from props,
 * so it draws the same on every device.
 */
export function PlanetWorld({
  plants,
  tier,
  stars,
  unlocks,
  width,
  style,
  selectedId,
  onPlantPress,
}: {
  selectedId?: string;
  /** Makes moons tappable (e.g. to show which session made them). */
  onPlantPress?: (plantId: string) => void;
  plants: Plant[];
  tier: number;
  stars: number;
  unlocks: UnlockKey[];
  width: number;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const c: Ink = { face: palette.face, ink: '#0E0E0E' };
  const R = 46 + tier * 5;
  const capacity = 30 + tier * 12;
  const shown = plants.slice(-capacity);
  const rand = seeded(97);
  const orbitR = (k: number) => R + 20 + k * ((CX - 30 - R - 20) / (ORBITS - 1));

  // Spread moons over the orbits, each a golden-angle step from the last so they never bunch up.
  const placed = shown.map((p, i) => {
    const k = i % ORBITS;
    const a = i * 2.39996 + rand() * 0.3;
    const rx = orbitR(k);
    return { p, x: CX + Math.cos(a) * rx, y: CY + Math.sin(a) * rx * TILT, back: Math.sin(a) < 0 };
  });

  const moon = ({ p, x, y }: (typeof placed)[number]) => {
    const r = MOON_R[p.species];
    return (
      <G key={p.id}>
        {p.id === selectedId && <Circle cx={x} cy={y} r={r + 6} fill="none" stroke={c.face} strokeWidth={1.6} strokeDasharray="3 2" />}
        <Moon species={p.species} stage={p.stage} x={x} y={y} c={c} />
      </G>
    );
  };

  // Rings (7-day streak): back half behind the planet, front half over it.
  const ringBack = `M${CX - R * 1.75} ${CY} A${R * 1.75} ${R * 0.5} 0 0 1 ${CX + R * 1.75} ${CY}`;
  const ringFront = `M${CX - R * 1.75} ${CY} A${R * 1.75} ${R * 0.5} 0 0 0 ${CX + R * 1.75} ${CY}`;

  // Taps pick the nearest moon (within reach), so the drawing itself needs no touch handlers.
  const onPress = onPlantPress
    ? (e: { nativeEvent: { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number } }) => {
        // Phones report locationX/Y; a mouse click on the web reports offsetX/Y.
        const n = e.nativeEvent;
        const k = W / width;
        const tx = (n.locationX ?? n.offsetX ?? -100) * k;
        const ty = (n.locationY ?? n.offsetY ?? -100) * k;
        let best: { id: string; d: number } | null = null;
        for (const m of placed) {
          const d = Math.hypot(m.x - tx, m.y - ty);
          if (d < 18 && (!best || d < best.d)) best = { id: m.p.id, d };
        }
        if (best) onPlantPress(best.id);
      }
    : undefined;

  const art = (
    <Svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} style={onPress ? undefined : style}>
      <Defs>
        <ClipPath id="planet-body">
          <Circle cx={CX} cy={CY} r={R} />
        </ClipPath>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} rx={26} fill={palette.space} />
      <Stars count={Math.min(stars, 140)} width={W} height={H} seed={5} />
      <Sparkle x={40} y={252} r={9} fill={c.face} />

      {unlocks.includes('seasons') && (
        <G>
          <Circle cx={W - 46} cy={44} r={16} fill={c.face} />
          <Path d="M36 40 L62 30 L84 46 L104 34" stroke={c.face} strokeWidth={0.8} fill="none" />
          {[
            [36, 40],
            [62, 30],
            [84, 46],
            [104, 34],
          ].map(([sx, sy]) => (
            <Circle key={`${sx}`} cx={sx} cy={sy} r={2} fill={c.face} />
          ))}
        </G>
      )}
      {unlocks.includes('creatures') && (
        <G stroke={c.face} strokeLinecap="round">
          <Line x1={250} y1={34} x2={290} y2={62} strokeWidth={1.4} opacity={0.6} />
          <Circle cx={292} cy={64} r={3} fill={c.face} />
          <Line x1={60} y1={230} x2={86} y2={250} strokeWidth={1.2} opacity={0.6} />
          <Circle cx={88} cy={252} r={2.4} fill={c.face} />
        </G>
      )}

      {/* Orbit paths */}
      {Array.from({ length: ORBITS }, (_, k) => (
        <Ellipse key={k} cx={CX} cy={CY} rx={orbitR(k)} ry={orbitR(k) * TILT} fill="none" stroke={c.face} strokeWidth={0.6} opacity={0.35} />
      ))}

      {placed.filter((m) => m.back).map(moon)}
      {unlocks.includes('stream') && <Path d={ringBack} fill="none" stroke={c.face} strokeWidth={3} />}

      {/* The planet: white face, ink outline, engraving hatch on the night side */}
      <Circle cx={CX} cy={CY} r={R} fill={c.face} stroke={c.ink} strokeWidth={2.5} />
      <G clipPath="url(#planet-body)">
        {Array.from({ length: 9 }, (_, i) => {
          const y = CY - R + ((i + 1) * 2 * R) / 10;
          return (
            <Line key={i} x1={CX - R} y1={y} x2={CX + R} y2={y + 4} stroke={c.ink} strokeWidth={i % 2 ? 1 : 2} />
          );
        })}
        <Circle cx={CX + R * 0.55} cy={CY + R * 0.1} r={R * 1.05} fill="none" stroke={c.ink} strokeWidth={R * 0.5} opacity={0.18} />
      </G>
      {unlocks.includes('waterfall') && (
        <G stroke={c.face} strokeWidth={1.6} fill="none" opacity={0.85}>
          <Path d={`M${CX - R * 0.7} ${CY - R - 4} q${R * 0.35} -12 ${R * 0.7} 0 t${R * 0.7} 0`} />
          <Path d={`M${CX - R * 0.55} ${CY - R - 12} q${R * 0.3} -10 ${R * 0.55} 0 t${R * 0.55} 0`} />
        </G>
      )}

      {unlocks.includes('stream') && <Path d={ringFront} fill="none" stroke={c.face} strokeWidth={3} />}
      {placed.filter((m) => !m.back).map(moon)}
    </Svg>
  );
  if (!onPress) return art;
  // A transparent layer on top takes the taps, so the drawing below never gets touch handlers.
  return (
    <View style={style}>
      {art}
      <Pressable
        onPress={onPress}
        accessibilityLabel="Your planet. Tap a moon to see which session made it."
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
