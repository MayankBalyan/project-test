import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { Plant, PlantStage, Species, UnlockKey } from '@/core/world';
import { usePalette } from '@/hooks/use-palette';

import { seeded, Sparkle, Stars } from './ink-art';

const W = 360;
const H = 300;
const GROUND_Y = 150;

type Ink = { face: string; ink: string };

function PlantArt({ species, stage, x, y, s, c }: { species: Species; stage: PlantStage; x: number; y: number; s: number; c: Ink }) {
  const stroke = { stroke: c.ink, strokeWidth: 1.6 };
  if (stage === 'seed') {
    return (
      <G>
        <Ellipse cx={x} cy={y} rx={5 * s} ry={2.5 * s} fill={c.face} {...stroke} />
        <Circle cx={x} cy={y - 1} r={1.2} fill={c.ink} />
      </G>
    );
  }
  if (stage === 'sprout' || stage === 'wilted') {
    const droop = stage === 'wilted';
    const h = 12 * s;
    return (
      <G opacity={droop ? 0.75 : 1}>
        <Path
          d={droop ? `M${x} ${y} q2 ${-h * 0.8} ${6 * s} ${-h * 0.6}` : `M${x} ${y} v${-h}`}
          stroke={c.face}
          strokeWidth={2.4}
          fill="none"
        />
        <Path
          d={
            droop
              ? `M${x + 6 * s} ${y - h * 0.6} q4 2 3 7 q-5 -1 -3 -7z`
              : `M${x} ${y - h} q-8 -2 -9 -8 q7 0 9 8z M${x} ${y - h * 0.8} q7 -3 9 -9 q-8 1 -9 9z`
          }
          fill={c.face}
          {...stroke}
        />
      </G>
    );
  }
  const k = stage === 'young' ? 0.6 * s : s;
  const trunk = <Rect x={x - 2 * k} y={y - 16 * k} width={4 * k} height={16 * k} fill={c.face} {...stroke} />;
  switch (species) {
    case 'flower':
      return (
        <G>
          <Line x1={x} y1={y} x2={x} y2={y - 16 * k} stroke={c.face} strokeWidth={2.4} />
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse
              key={a}
              cx={x}
              cy={y - 16 * k - 5 * k}
              rx={2.6 * k}
              ry={5 * k}
              fill={c.face}
              {...stroke}
              transform={`rotate(${a} ${x} ${y - 16 * k})`}
            />
          ))}
          <Circle cx={x} cy={y - 16 * k} r={2.6 * k} fill={c.ink} />
        </G>
      );
    case 'shrub':
      return (
        <G>
          <Path
            d={`M${x - 14 * k} ${y} q-4 -12 6 -14 q2 -10 10 -6 q8 -6 12 4 q8 2 0 16z`}
            fill={c.face}
            {...stroke}
          />
          <Path d={`M${x - 6 * k} ${y - 6 * k} l4 -3 M${x + 4 * k} ${y - 8 * k} l4 -2`} {...stroke} />
        </G>
      );
    case 'pine':
      return (
        <G>
          {trunk}
          {[0, 1, 2].map((i) => (
            <Path
              key={i}
              d={`M${x} ${y - (22 + i * 11) * k - 12 * k} l${(13 - i * 3) * k} ${18 * k} h${-(26 - i * 6) * k}z`}
              fill={c.face}
              {...stroke}
            />
          ))}
        </G>
      );
    case 'oak':
      return (
        <G>
          {trunk}
          <Path
            d={`M${x - 20 * k} ${y - 18 * k} q-6 -16 8 -20 q2 -14 16 -10 q12 -8 18 6 q12 4 4 20 q-8 8 -22 4 q-14 6 -24 0z`}
            fill={c.face}
            {...stroke}
          />
          {[0, 1, 2, 3].map((i) => (
            <Line
              key={i}
              x1={x - 12 * k + i * 7 * k}
              y1={y - 22 * k}
              x2={x - 8 * k + i * 7 * k}
              y2={y - 28 * k}
              {...stroke}
              strokeWidth={1}
            />
          ))}
        </G>
      );
    default:
      return (
        <G>
          {trunk}
          <Circle cx={x} cy={y - 24 * k} r={11 * k} fill={c.face} {...stroke} />
          <Path d={`M${x - 6 * k} ${y - 20 * k} q6 4 12 0`} {...stroke} fill="none" />
        </G>
      );
  }
}

/**
 * The user's floating island in space. Everything is derived from props so it redraws identically on every device.
 */
export function Island({
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
  /** Makes plants tappable (e.g. to show which session planted them). */
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
  const rx = 112 + tier * 10;
  const ry = 26 + tier * 2;
  const cx = W / 2;
  // Long sessions plant several trees, so there is room for plenty; the newest are shown.
  const capacity = 30 + tier * 12;
  const shown = plants.slice(-capacity);
  const rand = seeded(97);

  const placed = shown
    .map((p, i) => {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.82;
      const scale = { flower: 0.9, shrub: 1, sapling: 1.1, pine: 1.15, oak: 1.3 }[p.species];
      return { p, i, x: cx + Math.cos(a) * r * rx, y: GROUND_Y + Math.sin(a) * r * ry, s: scale };
    })
    .sort((a, b) => a.y - b.y);

  return (
    <Svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} style={style}>
      <Rect x={0} y={0} width={W} height={H} rx={26} fill={palette.space} />
      <Stars count={Math.min(stars, 140)} width={W} height={H} seed={5} />
      {unlocks.includes('seasons') && <Circle cx={W - 48} cy={46} r={18} fill={c.face} />}
      {unlocks.includes('creatures') && (
        <G>
          {[
            [70, 60],
            [92, 48],
            [260, 80],
          ].map(([bx, by], i) => (
            <Path key={i} d={`M${bx} ${by} q5 -6 10 0 q5 -6 10 0`} stroke={c.face} strokeWidth={2} fill="none" />
          ))}
        </G>
      )}
      <Sparkle x={40} y={250} r={9} fill={c.face} />

      {/* Rocky underside with engraving hatch lines */}
      <Path
        d={`M${cx - rx} ${GROUND_Y} C${cx - rx * 0.8} ${GROUND_Y + 70} ${cx - 30} ${GROUND_Y + 90} ${cx} ${GROUND_Y + 128} C${cx + 30} ${GROUND_Y + 90} ${cx + rx * 0.8} ${GROUND_Y + 70} ${cx + rx} ${GROUND_Y}z`}
        fill={c.face}
        stroke={c.ink}
        strokeWidth={2.5}
      />
      {Array.from({ length: 12 }, (_, i) => {
        const hx = cx - rx * 0.7 + (i * rx * 1.4) / 11;
        const len = 20 + (1 - Math.abs(hx - cx) / rx) * 60;
        return <Line key={i} x1={hx} y1={GROUND_Y + 16} x2={hx + 6} y2={GROUND_Y + 16 + len} stroke={c.ink} strokeWidth={1.2} />;
      })}
      {unlocks.includes('waterfall') && (
        <G>
          {[0, 5, 10].map((o) => (
            <Line key={o} x1={cx + rx - 18 + o} y1={GROUND_Y + 4} x2={cx + rx - 14 + o} y2={H - 6} stroke={c.face} strokeWidth={2} />
          ))}
        </G>
      )}

      {/* Grassy top */}
      <Ellipse cx={cx} cy={GROUND_Y} rx={rx} ry={ry} fill={c.face} stroke={c.ink} strokeWidth={2.5} />
      {unlocks.includes('stream') && (
        <Path
          d={`M${cx - rx * 0.7} ${GROUND_Y + 6} q${rx * 0.35} -18 ${rx * 0.7} 0 t${rx * 0.7} 0`}
          stroke={c.ink}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {placed.map(({ p, x, y, s }) => (
        <G key={p.id} onPress={onPlantPress ? () => onPlantPress(p.id) : undefined}>
          {onPlantPress && <Circle cx={x} cy={y - 12 * s} r={16 * s} fill="#000" opacity={0.001} />}
          {p.id === selectedId && (
            <G>
              <Circle cx={x} cy={y - 12 * s} r={20 * s} fill="none" stroke={c.face} strokeWidth={5} />
              <Circle cx={x} cy={y - 12 * s} r={20 * s} fill="none" stroke={c.ink} strokeWidth={2} strokeDasharray="4 3" />
            </G>
          )}
          <PlantArt species={p.species} stage={p.stage} x={x} y={y} s={s} c={c} />
        </G>
      ))}
    </Svg>
  );
}
