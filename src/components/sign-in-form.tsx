import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { isCompleteOtp, isValidEmail, normalizeEmail, normalizeOtp, OTP_LENGTH } from '@/core/auth-input';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/state/auth';
import { useNow } from '@/state/store';

import { Card, InkButton, TextField, Txt } from './ui';

const RESEND_AFTER_MS = 30_000;

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <Txt variant="bodyBold" role="alert">
      ✦ {children}
    </Txt>
  );
}

/** Email-code sign-in (plus Google when enabled). Used by the login screen. */
export function SignInForm() {
  const palette = usePalette();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(!!sentTo, 1000);
  // `now` can lag by up to a second after sending, so clamp to the full wait.
  const resendIn = Math.min(RESEND_AFTER_MS / 1000, Math.max(0, Math.ceil((sentAt + RESEND_AFTER_MS - now) / 1000)));

  const run = async (task: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);
    const result = await task();
    setBusy(false);
    if (result.error) setError(result.error);
    return !result.error;
  };

  const sendCode = async (to: string) => {
    if (!isValidEmail(to)) return setError('Enter a valid email address.');
    const ok = await run(() => auth.sendCode(to));
    if (ok) {
      setSentTo(normalizeEmail(to));
      setSentAt(Date.now());
      setCode('');
    }
  };

  const verify = async () => {
    if (!sentTo) return;
    if (!isCompleteOtp(code)) return setError(`Enter the ${OTP_LENGTH}-digit code from the email.`);
    await run(() => auth.verifyCode(sentTo, code));
  };

  return (
    <>
      {!auth.configured ? (
        <Card style={styles.group}>
          <Txt variant="section">Not set up yet</Txt>
          <Txt variant="caption" tone="inkSoft">
            This build has no Supabase settings. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to
            .env and restart the app.
          </Txt>
        </Card>
      ) : sentTo ? (
        <Card style={styles.group}>
          <Txt variant="caption" tone="inkSoft">
            We emailed a {OTP_LENGTH}-digit code to
          </Txt>
          <Txt variant="bodyBold">{sentTo}</Txt>
          <TextField
            label="Code"
            value={code}
            onChangeText={(t) => setCode(normalizeOtp(t))}
            placeholder="123456"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH + 2}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={verify}
          />
          <ErrorText>{error}</ErrorText>
          <InkButton label={busy ? 'Checking…' : 'Sign in'} disabled={busy} onPress={verify} />
          <View style={styles.links}>
            <Pressable
              role="button"
              onPress={() => {
                setSentTo(null);
                setError(null);
              }}
              hitSlop={8}>
              <Txt variant="label">Use another email</Txt>
            </Pressable>
            <Pressable
              role="button"
              disabled={busy || resendIn > 0}
              onPress={() => sendCode(sentTo)}
              hitSlop={8}>
              <Txt variant="label" tone={resendIn > 0 ? 'muted' : 'ink'}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
              </Txt>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Card style={styles.group}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={() => sendCode(email)}
          />
          <ErrorText>{error}</ErrorText>
          <InkButton label={busy ? 'Sending…' : 'Email me a code'} disabled={busy} onPress={() => sendCode(email)} />
          <Txt variant="caption" tone="muted">
            No password needed. New here? This creates your account.
          </Txt>
        </Card>
      )}

      {auth.googleEnabled && !sentTo && (
        <>
          <View style={styles.or}>
            <View style={[styles.rule, { backgroundColor: palette.line }]} />
            <Txt variant="label" tone="muted">
              or
            </Txt>
            <View style={[styles.rule, { backgroundColor: palette.line }]} />
          </View>
          <InkButton kind="outline" label="Continue with Google" disabled={busy} onPress={() => run(auth.signInWithGoogle)} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.three },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.three },
  or: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { flex: 1, height: 1 },
});
