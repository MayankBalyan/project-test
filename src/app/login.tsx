import { StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob, LogoMark, Moon } from '@/components/ink-art';
import { SignInForm } from '@/components/sign-in-form';
import { Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

/** The only screen available while signed out (see the protected routes in app/_layout.tsx). */
export default function LoginScreen() {
  const palette = usePalette();
  return (
    <Screen>
      <View style={styles.header}>
        <Blob size={150} variant={2} stars={20} style={styles.blob} />
        <Moon size={58} style={styles.moon} />
        <View style={styles.brand}>
          <LogoMark size={28} color={palette.ink} />
          <Txt variant="label">Istel</Txt>
        </View>
        <Heading3D size={64} depth={6}>
          {'Sign\nin'}
        </Heading3D>
        <Txt tone="inkSoft">
          Sign in with your email to keep your habits, streaks and island safe on every device. No password —
          we’ll email you a code.
        </Txt>
      </View>
      <SignInForm />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -10 },
  moon: { position: 'absolute', right: 96, top: 40 },
});
