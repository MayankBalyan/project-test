import { usePathname } from 'expo-router';
import { TabSlot, type TabsDescriptor, type TabsSlotRenderOptions } from 'expo-router/ui';
import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from 'react-native-screens';

const DURATION_MS = 280;
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

type Role = 'in' | 'out' | 'idle';

/**
 * One tab's content. When it becomes the focused tab it slides in from the side it lives on; the tab it
 * replaces slides out the other way, so moving right along the bar pushes screens to the left and back.
 */
function Scene({ role, direction, run, children }: { role: Role; direction: 1 | -1; run: number; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);

  // Layout effect: the start position is set before the frame that first shows the incoming screen.
  useLayoutEffect(() => {
    if (!run || role === 'idle') {
      x.value = 0;
      return;
    }
    const [from, to] = role === 'in' ? [direction * width, 0] : [0, -direction * width];
    x.value = withSequence(withTiming(from, { duration: 0 }), withTiming(to, { duration: DURATION_MS, easing: EASE }));
  }, [run, role, direction, width, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

/** Tab screens for phones: switching tabs slides left or right in the order of the bottom bar. */
export function SlidingTabSlot({ order, style }: { order: readonly string[]; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const index = order.indexOf(pathname);
  const [nav, setNav] = useState({ current: index, previous: -1, run: 0 });

  // A new tab: remember where we came from (updating state during render keeps both in one frame).
  if (index !== -1 && index !== nav.current) {
    setNav({ current: index, previous: reduceMotion ? -1 : nav.current, run: reduceMotion ? nav.run : nav.run + 1 });
  }

  // Once the slide is over, the old tab goes back to being hidden.
  useEffect(() => {
    if (nav.previous === -1) return;
    const id = setTimeout(() => setNav((n) => (n.run === nav.run ? { ...n, previous: -1 } : n)), DURATION_MS + 40);
    return () => clearTimeout(id);
  }, [nav.previous, nav.run]);

  const direction: 1 | -1 = nav.current > nav.previous ? 1 : -1;

  const render = (descriptor: TabsDescriptor, { index: i, isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions) => {
    const { lazy = true } = descriptor.options;
    if (lazy && !loaded && !isFocused) return null;
    const leaving = !isFocused && i === nav.previous;
    const visible = isFocused || leaving;
    const role: Role = isFocused && nav.previous !== -1 ? 'in' : leaving ? 'out' : 'idle';
    return (
      <Screen
        key={descriptor.route.key}
        enabled={detachInactiveScreens}
        activityState={visible ? 2 : 0}
        style={[styles.screen, visible ? styles.visible : styles.hidden, leaving && StyleSheet.absoluteFill]}>
        <Scene role={role} direction={direction} run={nav.run}>
          {descriptor.render()}
        </Scene>
      </Screen>
    );
  };

  return <TabSlot style={[styles.clip, style]} renderFn={render} />;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
  screen: { flex: 1, position: 'relative', height: '100%' },
  visible: { zIndex: 1, display: 'flex', flexShrink: 0, flexGrow: 1 },
  hidden: { zIndex: -1, display: 'none', flexShrink: 1, flexGrow: 0 },
});
