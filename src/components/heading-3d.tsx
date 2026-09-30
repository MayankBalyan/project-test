import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';

type Props = {
  children: string;
  size?: number;
  /** How far the extrusion goes down, in layers (1 layer ≈ size / 28 px). */
  depth?: number;
  align?: TextStyle['textAlign'];
  /** Front face color. Defaults to white on paper, paper on dark mode. */
  face?: string;
  /** Outline and extrusion color. */
  ink?: string;
  style?: StyleProp<ViewStyle>;
};

const OUTLINE_DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * The display heading from the reference: Anton caps with a white face, an ink outline and a stacked ink
 * extrusion going down. Built from stacked <Text> layers so it renders the same on iOS, Android and web.
 */
export function Heading3D({ children, size = 64, depth = 7, align = 'left', face, ink, style }: Props) {
  const palette = usePalette();
  const dark = useColorScheme() === 'dark';
  const faceColor = face ?? (dark ? palette.paper : palette.face);
  const inkColor = ink ?? palette.ink;
  const step = Math.max(1, size / 28);
  const stroke = Math.max(1.5, size * 0.03);
  const text = children.toUpperCase();

  const base: TextStyle = {
    fontFamily: Fonts.display,
    fontSize: size,
    lineHeight: size * 1.04,
    textAlign: align,
    letterSpacing: size * 0.01,
  };

  const layer = (key: string, dx: number, dy: number, color: string) => (
    <Text
      key={key}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[base, styles.layer, { color, transform: [{ translateX: dx }, { translateY: dy }] }]}>
      {text}
    </Text>
  );

  const extrusion = Array.from({ length: depth }, (_, i) => depth - i).map((n) =>
    layer(`x${n}`, n * step * 0.15, n * step, inkColor),
  );
  const outline = OUTLINE_DIRECTIONS.map(([dx, dy]) => layer(`o${dx}${dy}`, dx * stroke, dy * stroke, inkColor));

  return (
    <View style={[{ paddingBottom: depth * step + stroke }, style]}>
      {extrusion}
      {outline}
      <Text role="heading" style={[base, { color: faceColor }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
