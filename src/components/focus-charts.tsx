import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { FocusStats, formatMinutes } from '@/core/focus-stats';
import { usePalette } from '@/hooks/use-palette';

import { Txt } from './ui';

const CHART_H = 140;
const LABEL_H = 18;

function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** Bar with a 4px rounded top and a square bottom on the baseline. */
function barPath(x: number, w: number, top: number, base: number) {
  const r = Math.min(4, w / 2, base - top);
  return `M${x} ${base}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + w - r}Q${x + w} ${top} ${x + w} ${top + r}V${base}Z`;
}

/** Focus minutes per week. Tap or hover a bar to read it; the latest week is selected by default. */
export function WeeklyFocusChart({ weeks }: { weeks: FocusStats['weeks'] }) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(weeks.length - 1);
  const max = Math.max(60, ...weeks.map((w) => w.minutes));
  // Round the scale up to whole hours so the gridline label reads cleanly.
  const top = Math.ceil(max / 60) * 60;
  const slot = width / weeks.length;
  const barW = Math.max(4, Math.min(22, slot - 6));
  const y = (m: number) => CHART_H - (m / top) * (CHART_H - 8);
  const sel = weeks[selected];

  return (
    <View style={styles.chart}>
      <View style={styles.readout} aria-live="polite">
        <Txt variant="bodyBold">
          {selected === weeks.length - 1 ? 'This week' : `Week of ${shortDate(sel.start)}`} · {formatMinutes(sel.minutes)}
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          {sel.sessions} {sel.sessions === 1 ? 'session' : 'sessions'}
        </Txt>
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={CHART_H + LABEL_H}>
            <Line x1={0} x2={width} y1={y(top)} y2={y(top)} stroke={palette.line} strokeWidth={1} />
            <Line x1={0} x2={width} y1={y(top / 2)} y2={y(top / 2)} stroke={palette.line} strokeWidth={1} />
            {weeks.map((w, i) =>
              w.minutes > 0 ? (
                <Path
                  key={w.start}
                  d={barPath(i * slot + (slot - barW) / 2, barW, y(w.minutes), CHART_H)}
                  fill={i === selected ? palette.ink : palette.heat[2]}
                />
              ) : null,
            )}
            <Line x1={0} x2={width} y1={CHART_H} y2={CHART_H} stroke={palette.ink} strokeWidth={1.5} />
          </Svg>
        )}
        {width > 0 && (
          <View style={styles.hits}>
            {weeks.map((w, i) => (
              <Pressable
                key={w.start}
                accessibilityLabel={`Week of ${shortDate(w.start)}: ${formatMinutes(w.minutes)}`}
                onPress={() => setSelected(i)}
                onHoverIn={() => setSelected(i)}
                style={{ width: slot, height: CHART_H }}
              />
            ))}
          </View>
        )}
        {width > 0 && (
          <View style={[StyleSheet.absoluteFill, styles.labels]} pointerEvents="none">
            <Txt variant="caption" tone="muted" style={[styles.axis, { top: y(top) - 16 }]}>
              {formatMinutes(top)}
            </Txt>
            {weeks.map((w, i) =>
              i % 3 === 2 || i === 0 ? (
                <Txt
                  key={w.start}
                  variant="caption"
                  tone="muted"
                  style={[styles.xLabel, { left: Math.min(width - 48, Math.max(0, i * slot + slot / 2 - 24)), top: CHART_H + 3 }]}>
                  {shortDate(w.start)}
                </Txt>
              ) : null,
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/** Minutes per tag over the last 30 days, as labeled horizontal bars. */
export function TagBars({ byTag }: { byTag: FocusStats['byTag'] }) {
  const palette = usePalette();
  const max = Math.max(1, ...byTag.map((t) => t.minutes));
  if (byTag.length === 0) {
    return (
      <Txt variant="caption" tone="inkSoft">
        No finished sessions in the last 30 days.
      </Txt>
    );
  }
  return (
    <View style={styles.tags}>
      {byTag.map((t) => (
        <View key={t.tag} style={styles.tagRow} aria-label={`${t.tag}: ${formatMinutes(t.minutes)}`}>
          <Txt variant="label" style={styles.tagName} numberOfLines={1}>
            {t.tag}
          </Txt>
          <View style={styles.tagTrack}>
            <View
              style={[
                styles.tagBar,
                { width: `${Math.max(3, (t.minutes / max) * 100)}%`, backgroundColor: palette.ink },
              ]}
            />
          </View>
          <Txt variant="caption" style={styles.tagValue}>
            {formatMinutes(t.minutes)}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: Spacing.two },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  labels: { overflow: 'visible' },
  hits: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  axis: { position: 'absolute', left: 0, fontSize: 10 },
  xLabel: { position: 'absolute', width: 48, textAlign: 'center', fontSize: 10 },
  tags: { gap: Spacing.two },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tagName: { width: 72 },
  tagTrack: { flex: 1, height: 12 },
  tagBar: { height: '100%', borderTopRightRadius: Radius.pill, borderBottomRightRadius: Radius.pill },
  tagValue: { width: 56, textAlign: 'right' },
});
