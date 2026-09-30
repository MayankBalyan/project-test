import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob } from '@/components/ink-art';
import { Txt } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startPwa } from '@/lib/pwa';
import { AuthProvider, useAuth } from '@/state/auth';
import { IstelProvider, useIstel } from '@/state/store';

SplashScreen.preventAutoHideAsync();
startPwa();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [loaded, error] = useFonts({
    Anton_400Regular,
    Oswald_500Medium,
    Oswald_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // Browser scrollbars, form controls and the page behind the app follow the chosen theme too.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.documentElement.style.colorScheme = scheme;
    document.body.style.backgroundColor = Colors[scheme].paper;
    // The installed app's title bar too.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', Colors[scheme].paper));
  }, [scheme]);

  if (!loaded && !error) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: Colors[scheme].paper, text: Colors[scheme].ink },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <IstelProvider>
          <AppStack paper={Colors[scheme].paper} />
        </IstelProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Loading() {
  return (
    <View style={styles.loading}>
      <Blob size={140} variant={1} stars={18} />
      <Heading3D size={40} depth={4}>
        Istel
      </Heading3D>
      <ActivityIndicator />
      <Txt variant="label" tone="inkSoft">
        Loading your island…
      </Txt>
    </View>
  );
}

/**
 * Istel needs an account: signed out, only the sign-in screen exists. Builds without Supabase settings
 * (local development) skip sign-in so the app keeps working.
 */
function AppStack({ paper }: { paper: string }) {
  const auth = useAuth();
  const { sync } = useIstel();
  const signedIn = !auth.configured || !!auth.user;
  // Right after signing in, wait for the account's data so a returning user doesn't see onboarding.
  // If that first sync fails (offline), carry on with what's on this device.
  const firstSync =
    !!auth.user &&
    (sync.accountId !== auth.user.id || sync.lastSyncedAt === null) &&
    sync.status.state !== 'error';

  if (auth.loading || firstSync) return <Loading />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: paper } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
});
