import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/state/auth';
import { IstelProvider } from '@/state/store';

SplashScreen.preventAutoHideAsync();

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
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors[scheme].paper } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="account" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
            <Stack.Screen name="auth/callback" />
          </Stack>
        </IstelProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
