import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { InkButton, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/state/auth';

/**
 * Where Google sends people back after signing in. On web the Supabase client reads the `code` from this
 * URL by itself; native apps finish the exchange in `signInWithGoogle`. Either way, we move on to the
 * app once a session exists.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ error_description?: string; error?: string }>();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const error = params.error_description ?? params.error ?? (timedOut ? 'We couldn’t finish signing you in.' : null);

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user]);

  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 10_000);
    return () => clearTimeout(id);
  }, []);

  return (
    <Screen>
      {error ? (
        <>
          <Txt variant="section">Sign-in didn’t finish</Txt>
          <Txt role="alert">{error}</Txt>
          <InkButton label="Try again" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <ActivityIndicator style={styles.spinner} />
          <Txt variant="label" style={styles.center}>
            Signing you in…
          </Txt>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: Spacing.six },
  center: { textAlign: 'center' },
});
