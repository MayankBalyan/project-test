import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { normalizeEmail, normalizeOtp, parseAuthRedirect } from '@/core/auth-input';
import { googleSignInEnabled, supabase } from '@/lib/supabase';

type Result = { error?: string };

const NOT_CONFIGURED = 'Sign-in is not set up in this build.';

function friendly(message: string): string {
  if (/rate limit|security purposes/i.test(message)) return 'Too many tries. Wait a minute and try again.';
  if (/expired|invalid/i.test(message) && /token|otp|code/i.test(message)) return 'That code is wrong or has expired.';
  if (/network|fetch/i.test(message)) return 'Can’t reach the server. Check your connection.';
  return message;
}

function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const actions = useMemo(
    () => ({
      /** Emails a 6-digit code. Creates the account on first use. */
      sendCode: async (email: string): Promise<Result> => {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizeEmail(email),
          options: {
            shouldCreateUser: true,
            data: { home_tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
          },
        });
        return error ? { error: friendly(error.message) } : {};
      },

      verifyCode: async (email: string, code: string): Promise<Result> => {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.verifyOtp({
          email: normalizeEmail(email),
          token: normalizeOtp(code),
          type: 'email',
        });
        return error ? { error: friendly(error.message) } : {};
      },

      signInWithGoogle: async (): Promise<Result> => {
        if (!supabase) return { error: NOT_CONFIGURED };
        if (Platform.OS === 'web') {
          // The page leaves for Google and comes back to /auth/callback, where the session is picked up.
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          return error ? { error: friendly(error.message) } : {};
        }
        const redirectTo = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error || !data.url) return { error: friendly(error?.message ?? 'Could not start Google sign-in.') };
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type !== 'success') return {};
        const { code, error: redirectError } = parseAuthRedirect(result.url);
        if (redirectError) return { error: redirectError };
        if (!code) return { error: 'Google sign-in did not finish.' };
        const exchange = await supabase.auth.exchangeCodeForSession(code);
        return exchange.error ? { error: friendly(exchange.error.message) } : {};
      },

      signOut: async (): Promise<Result> => {
        if (!supabase) return {};
        const { error } = await supabase.auth.signOut();
        return error ? { error: friendly(error.message) } : {};
      },
    }),
    [],
  );

  return {
    configured: !!supabase,
    googleEnabled: !!supabase && googleSignInEnabled,
    loading,
    session,
    user: session?.user ?? null,
    ...actions,
  };
}

type AuthState = ReturnType<typeof useAuthState>;
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const state = useAuthState();
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
