import { type ReactNode, useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { clampFocusMinutes, FOCUS_MAX_MINUTES, FOCUS_MIN_MINUTES, FOCUS_STEP_MINUTES, MINUTES_PER_TREE } from '@/core/world';
import { usePalette } from '@/hooks/use-palette';

const STROKE = 10;
const KNOB = 15;

/**
 * Drag around the ring to pick a focus length (10 minutes to 3 hours, 5-minute steps). A full turn is 3 hours;
 * the bold ticks mark every half hour, where a session earns one more moon. The dial stops at both ends
 * instead of wrapping around.
 */
export function FocusDial({
  size,
  minutes,
  onChange,
  children,
}: {
  size: number;
  minutes: number;
  onChange: (minutes: number) => void;
  children?: ReactNode;
}) {
  const palette = usePalette();
  const c = size / 2;
  const r = size / 2 - 22;
  // Handlers read the latest values through refs, so the responder is created once.
  const latest = useRef({ minutes, onChange, c, r });
  useEffect(() => {
    latest.current = { minutes, onChange, c, r };
  });
  const origin = useRef({ x: 0, y: 0 });

  // The handlers only read `latest`/`origin` when a touch arrives, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    const toMinutes = (x: number, y: number) => {
      const { c } = latest.current;
      let a = Math.atan2(x - c, -(y - c));
      if (a < 0) a += Math.PI * 2;
      const raw = (a / (Math.PI * 2)) * FOCUS_MAX_MINUTES;
      // No wrapping past the top: near the end stays at 3 hours, near the start stays at the minimum.
      const prev = latest.current.minutes;
      if (prev > FOCUS_MAX_MINUTES * 0.75 && raw < FOCUS_MAX_MINUTES * 0.25) return FOCUS_MAX_MINUTES;
      if (prev < FOCUS_MAX_MINUTES * 0.25 && raw > FOCUS_MAX_MINUTES * 0.75) return FOCUS_MIN_MINUTES;
      return clampFocusMinutes(raw);
    };
    const set = (x: number, y: number) => {
      const next = toMinutes(x, y);
      if (next !== latest.current.minutes) {
        latest.current.minutes = next;
        latest.current.onChange(next);
      }
    };
    return PanResponder.create({
      // Only the ring band starts a drag, so the page still scrolls from the middle of the dial.
      onStartShouldSetPanResponder: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const { c, r } = latest.current;
        return Math.hypot(locationX - c, locationY - c) > r * 0.55;
      },
      onMoveShouldSetPanResponder: () => false,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { pageX, pageY, locationX, locationY } = e.nativeEvent;
        origin.current = { x: pageX - locationX, y: pageY - locationY };
        set(locationX, locationY);
      },
      onPanResponderMove: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        set(pageX - origin.current.x, pageY - origin.current.y);
      },
    });
  });

  const progress = minutes / FOCUS_MAX_MINUTES;
  const circumference = 2 * Math.PI * r;
  const knobAngle = progress * Math.PI * 2 - Math.PI / 2;
  const ticks = FOCUS_MAX_MINUTES / FOCUS_STEP_MINUTES;
  const perTree = MINUTES_PER_TREE / FOCUS_STEP_MINUTES;

  const step = (delta: number) => onChange(clampFocusMinutes(minutes + delta));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={palette.line} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={palette.ink}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${c} ${c})`}
        />
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const bold = i % perTree === 0;
          const inner = r - (bold ? 24 : 17);
          return (
            <Line
              key={i}
              x1={c + Math.cos(a) * inner}
              y1={c + Math.sin(a) * inner}
              x2={c + Math.cos(a) * (r - 12)}
              y2={c + Math.sin(a) * (r - 12)}
              stroke={palette.ink}
              strokeWidth={bold ? 2.4 : 1}
            />
          );
        })}
        <Circle
          cx={c + Math.cos(knobAngle) * r}
          cy={c + Math.sin(knobAngle) * r}
          r={KNOB}
          fill={palette.ink}
          stroke={palette.paper}
          strokeWidth={4}
        />
      </Svg>
      {children}
      {/* Touch surface on top, so every touch is measured against the dial itself. */}
      <View
        {...responder.panHandlers}
        role="slider"
        aria-label="Focus length"
        aria-valuemin={FOCUS_MIN_MINUTES}
        aria-valuemax={FOCUS_MAX_MINUTES}
        aria-valuenow={minutes}
        aria-valuetext={`${minutes} minutes`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? FOCUS_STEP_MINUTES : -FOCUS_STEP_MINUTES)}
        focusable
        // Arrow keys on the web.
        {...(Platform.OS === 'web'
          ? {
              onKeyDown: (e: { key: string; preventDefault: () => void }) => {
                const delta = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 30, PageDown: -30 }[e.key];
                if (delta) {
                  e.preventDefault();
                  step(delta);
                }
              },
            }
          : {})}
        style={[StyleSheet.absoluteFill, styles.surface]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // On the web, keep the browser from scrolling the page while a finger drags the dial.
  surface: Platform.select({ web: { touchAction: 'none', cursor: 'grab' } as object, default: {} }),
});
