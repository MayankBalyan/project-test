// Gives iOS/Android a localStorage (backed by SQLite) so the session survives restarts; web uses the browser's.
import 'expo-sqlite/localStorage/install';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Whether "Continue with Google" is enabled on the Supabase project. */
export const googleSignInEnabled = process.env.EXPO_PUBLIC_AUTH_GOOGLE === 'true';

/**
 * Null when the app is built without Supabase settings. Istel still works fully offline then;
 * only sign-in is unavailable.
 */
export const supabase: SupabaseClient | null =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          storage: globalThis.localStorage,
          autoRefreshToken: true,
          persistSession: true,
          // Web receives OAuth results in the page URL; native apps handle the redirect themselves.
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
        },
      })
    : null;

// Native apps only refresh tokens while in the foreground, as Supabase recommends.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
