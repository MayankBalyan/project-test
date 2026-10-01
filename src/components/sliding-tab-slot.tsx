import { type Href, router, usePathname } from 'expo-router';
import { TabSlot, type TabsDescriptor, type TabsSlotRenderOptions } from 'expo-router/ui';
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
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
/** A swipe changes tab when it travels this far sideways, or is flicked this fast (px/ms). */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 0.5;

/** On the web: whether a touch started inside something that scrolls sideways (e.g. a row of chips). */
function inHorizontalScroller(target: unknown): boolean {
  if (Platform.OS !== 'web') return false;
  for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    const overflowX = getComputedStyle(el).overflowX;
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}
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

/**
 * Tab screens for phones: switching tabs slides left or right in the order of the bottom bar, and swiping
 * left or right moves to the next or previous tab.
 */
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

  // Swipes: handlers read the current tab through a ref, so the responder is made once.
  const latest = useRef({ index, order });
  useEffect(() => {
    latest.current = { index, order };
  });
  // The handlers only read `latest` when a gesture arrives, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [swipe] = useState(() =>
    PanResponder.create({
      // Only clearly sideways moves; vertical scrolling, the focus dial and sideways rows keep theirs.
      onMoveShouldSetPanResponder: (e, g) =>
        Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 2 && !inHorizontalScroller(e.nativeEvent.target),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < SWIPE_DISTANCE && Math.abs(g.vx) < SWIPE_VELOCITY) return;
        const { index: at, order: tabs } = latest.current;
        if (at === -1) return;
        // Finger moving left brings in the tab to the right, like turning a page.
        const next = tabs[at + (g.dx < 0 ? 1 : -1)];
        if (next) router.navigate(next as Href);
      },
    }),
  );

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

  return (
    <View style={[styles.fill, style]} {...swipe.panHandlers}>
      <TabSlot style={[styles.clip, styles.fill]} renderFn={render} />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  fill: { flex: 1 },
  screen: { flex: 1, position: 'relative', height: '100%' },
  visible: { zIndex: 1, display: 'flex', flexShrink: 0, flexGrow: 1 },
  hidden: { zIndex: -1, display: 'none', flexShrink: 1, flexGrow: 0 },
});
