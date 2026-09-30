import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useIsWide } from '@/hooks/use-palette';

import { Heading3D } from './heading-3d';
import { Txt } from './ui';

/** Screen title block: a big 3D heading with ink decorations floating behind it, like the reference. */
export function Hero({ title, subtitle, art }: { title: string; subtitle?: string; art?: ReactNode }) {
  const wide = useIsWide();
  return (
    <View style={[styles.hero, { minHeight: wide ? 250 : 180 }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {art}
      </View>
      <Heading3D size={wide ? 104 : 62} depth={wide ? 9 : 7}>
        {title}
      </Heading3D>
      {subtitle ? (
        <Txt variant="bodyBold" tone="inkSoft" style={styles.subtitle}>
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { justifyContent: 'flex-end', paddingTop: Spacing.four },
  subtitle: { marginTop: Spacing.two, maxWidth: 420 },
});
