import { Pressable, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob, LogoMark, Moon, Planet } from '@/components/ink-art';
import { SignInForm } from '@/components/sign-in-form';
import { Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { openSitePage, siteLinks } from '@/lib/site';

const PERKS = ['A streak grid for every habit', 'A focus timer that follows you', 'A planet whose moons grow as you do'];

/** The only screen available while signed out (see the protected routes in app/_layout.tsx). */
export default function LoginScreen() {
  const palette = usePalette();
  const wide = useIsWide();

  return (
    <Screen center>
      <View style={[styles.main, wide && styles.mainWide]}>
        <View style={[styles.intro, wide && styles.side]}>
          <Blob size={wide ? 170 : 150} variant={2} stars={20} style={wide ? styles.blobWide : styles.blob} />
          <Moon size={58} style={wide ? styles.moonWide : styles.moon} />
          <View style={styles.brand}>
            <LogoMark size={28} color={palette.ink} />
            <Txt variant="label">Istel</Txt>
          </View>
          <Heading3D size={wide ? 80 : 64} depth={6}>
            {'Sign\nin'}
          </Heading3D>
          <Txt tone="inkSoft">
            Sign in with your email to keep your habits, streaks and planet safe on every device. No password —
            we’ll email you a code.
          </Txt>
          <View style={styles.perks}>
            {PERKS.map((perk) => (
              <Txt key={perk} variant="label" tone="inkSoft">
                ✦ {perk}
              </Txt>
            ))}
          </View>
        </View>
        <View style={[styles.formSide, wide && styles.side]}>
          {wide && <Planet size={220} style={styles.planet} />}
          <SignInForm />
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable role="link" onPress={() => openSitePage(siteLinks.privacy)} hitSlop={8}>
          <Txt variant="caption" tone="muted">
            Privacy policy ↗
          </Txt>
        </Pressable>
        <Txt variant="caption" tone="muted">
          istel.space
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  main: { flexGrow: 1, justifyContent: 'center', gap: Spacing.four },
  mainWide: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  side: { flex: 1 },
  intro: { gap: Spacing.three },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  perks: { gap: Spacing.one, marginTop: Spacing.one },
  formSide: { gap: Spacing.three },
  planet: { alignSelf: 'center' },
  blob: { position: 'absolute', right: -40, top: -10 },
  moon: { position: 'absolute', right: 96, top: 40 },
  blobWide: { position: 'absolute', right: -30, top: -30 },
  moonWide: { position: 'absolute', right: 110, top: 70 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.three },
});
