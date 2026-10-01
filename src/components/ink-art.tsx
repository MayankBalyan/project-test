import { useId } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { usePalette } from '@/hooks/use-palette';

/** Deterministic pseudo-random numbers so art looks the same on every render and device. */
export function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const BLOB_PATHS = [
  'M104 8c38 2 78 26 88 66 10 42-8 92-48 112-40 20-100 14-128-20C-10 132 2 76 28 42 46 18 72 6 104 8z',
  'M96 4c44-2 92 28 100 78 8 48-30 104-82 112C62 202 14 170 6 122-2 74 30 20 60 10c12-4 24-6 36-6z',
  'M112 6c34 8 70 34 80 72 12 44-4 88-44 106-44 20-104 6-130-34C-6 114 8 58 42 30 62 12 88 0 112 6z',
];

export function Sparkle({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const w = r * 0.22;
  return (
    <Path
      d={`M${x} ${y - r} Q${x + w} ${y - w} ${x + r} ${y} Q${x + w} ${y + w} ${x} ${y + r} Q${x - w} ${y + w} ${x - r} ${y} Q${x - w} ${y - w} ${x} ${y - r}Z`}
      fill={fill}
    />
  );
}

/** Star field for dark "space" areas: dots plus a few sparkles. */
export function Stars({
  count,
  width,
  height,
  seed = 1,
  fill = '#FFFFFF',
}: {
  count: number;
  width: number;
  height: number;
  seed?: number;
  fill?: string;
}) {
  const rand = seeded(seed);
  return (
    <G>
      {Array.from({ length: count }, (_, i) => {
        const x = rand() * width;
        const y = rand() * height;
        const size = rand();
        return i % 9 === 0 ? (
          <Sparkle key={i} x={x} y={y} r={4 + size * 6} fill={fill} />
        ) : (
          <Circle key={i} cx={x} cy={y} r={0.6 + size * 1.4} fill={fill} opacity={0.5 + size * 0.5} />
        );
      })}
    </G>
  );
}

/** Organic black blob filled with stars, like the shapes in the reference. */
export function Blob({
  size,
  variant = 0,
  stars = 18,
  style,
}: {
  size: number;
  variant?: number;
  stars?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const clip = `blob${useId().replace(/:/g, '')}`;
  const d = BLOB_PATHS[variant % BLOB_PATHS.length];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={style} pointerEvents="none">
      <Defs>
        <ClipPath id={clip}>
          <Path d={d} />
        </ClipPath>
      </Defs>
      <Path d={d} fill={palette.space} />
      <G clipPath={`url(#${clip})`}>
        <Stars count={stars} width={200} height={200} seed={variant + 3} />
      </G>
    </Svg>
  );
}

/** Ringed planet in engraving style: hatched body and an elliptical ring. */
export function Planet({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  const ink = palette.ink;
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 200 140" style={style} pointerEvents="none">
      <Ellipse cx={100} cy={74} rx={92} ry={22} fill="none" stroke={ink} strokeWidth={3} transform="rotate(-14 100 74)" />
      <Circle cx={100} cy={70} r={44} fill={palette.artFill} stroke={ink} strokeWidth={3} />
      {Array.from({ length: 7 }, (_, i) => {
        const y = 38 + i * 10;
        const half = Math.sqrt(Math.max(0, 44 * 44 - (y - 70) ** 2));
        return <Line key={i} x1={100 - half + 4} y1={y} x2={100 + half - 4} y2={y + 3} stroke={ink} strokeWidth={i % 2 ? 1.2 : 2.4} />;
      })}
      <Path d="M18 86 Q100 114 184 62" fill="none" stroke={ink} strokeWidth={3} />
    </Svg>
  );
}

const CRATERS = [
  [32, 30, 9],
  [62, 24, 5],
  [70, 52, 10],
  [40, 62, 6],
  [26, 48, 3],
  [55, 76, 5],
  [50, 44, 3],
];

/** Cratered moon. */
export function Moon({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const palette = usePalette();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style} pointerEvents="none">
      <Circle cx={50} cy={50} r={46} fill={palette.artFill} stroke={palette.ink} strokeWidth={2.5} />
      {CRATERS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="none" stroke={palette.ink} strokeWidth={1.6} />
      ))}
      <Path d="M20 70 Q40 92 76 82" fill="none" stroke={palette.ink} strokeWidth={1.2} />
    </Svg>
  );
}

/** Istel mark: an orbit spiral with a sprout, echoing the reference logo. */
export function LogoMark({ size = 28, color }: { size?: number; color?: string }) {
  const palette = usePalette();
  const ink = color ?? palette.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M16 29a13 13 0 1 1 12-18" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      <Path d="M16 23a7 7 0 1 1 6-10" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      {/* Sapling: stem and two leaves, centered on the rings' middle (16,16). */}
      <Path d="M16 18.8v-4.8" fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M16 15.6c-2.08 0-2.88-1.28-2.88-2.88 1.92 0 2.88 1.12 2.88 2.88zM16 14.56c0-1.6.96-2.96 2.88-2.96 0 1.76-.96 2.96-2.88 2.96z" fill={ink} stroke={ink} strokeWidth={0.72} strokeLinejoin="round" />
    </Svg>
  );
}

export type TabIconName = 'today' | 'todo' | 'focus' | 'island' | 'streaks';

export function TabIcon({ name, color, size = 22 }: { name: TabIconName; color: string; size?: number }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' && (
        <G>
          <Circle cx={12} cy={12} r={4.5} {...common} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <Line
                key={i}
                x1={12 + Math.cos(a) * 7.5}
                y1={12 + Math.sin(a) * 7.5}
                x2={12 + Math.cos(a) * 10}
                y2={12 + Math.sin(a) * 10}
                {...common}
              />
            );
          })}
        </G>
      )}
      {name === 'todo' && (
        <G>
          {/* A checklist: a ticked box on top, an empty one below, each with a line of text. */}
          <Rect x={3} y={3.5} width={6} height={6} rx={1.5} {...common} strokeWidth={1.8} />
          <Path d="M4.6 6.6l1.4 1.4 2.6-3" {...common} strokeWidth={1.8} />
          <Rect x={3} y={14.5} width={6} height={6} rx={1.5} {...common} strokeWidth={1.8} />
          <Path d="M12.5 6.5h8.5M12.5 17.5h8.5" {...common} />
        </G>
      )}
      {name === 'focus' && (
        <G>
          <Circle cx={12} cy={13.5} r={8} {...common} />
          <Path d="M12 9v4.5l3 2M9.5 2.5h5" {...common} />
        </G>
      )}
      {name === 'island' && (
        <G>
          <Path d="M3 13h18l-5 6h-8z" {...common} />
          <Path d="M12 13V6M12 8c-3 0-4-2-4-4 3 0 4 2 4 4zM12 7c0-2 2-4 4-4 0 3-2 4-4 4z" {...common} />
        </G>
      )}
      {name === 'streaks' && (
        <G>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <Rect key={`${r}${c}`} x={3 + c * 6.5} y={3 + r * 6.5} width={5} height={5} rx={1} {...common} strokeWidth={1.6} fill={(r + c) % 2 ? color : 'none'} />
            )),
          )}
        </G>
      )}
    </Svg>
  );
}

/** A rain drop: filled when a Rain Day is saved up, outlined when the slot is empty. */
export function RainDrop({ size = 16, filled, color }: { size?: number; filled: boolean; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5C9 7 5.5 10.6 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}
