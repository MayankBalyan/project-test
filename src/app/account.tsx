import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob, Moon } from '@/components/ink-art';
import { Card, InkButton, Screen, TextField, Toggle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { isCompleteOtp, isValidEmail, normalizeEmail, normalizeOtp, OTP_LENGTH } from '@/core/auth-input';
import { usePalette } from '@/hooks/use-palette';
import { useAuth } from '@/state/auth';
import { useNow, useRootline } from '@/state/store';
import type { SyncStatus } from '@/state/use-sync';

const RESEND_AFTER_MS = 30_000;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Blob size={130} variant={0} stars={16} style={styles.blob} />
      <Moon size={54} style={styles.moon} />
      <Pressable role="button" onPress={close} hitSlop={12} style={styles.back}>
        <Txt variant="label">← Back</Txt>
      </Pressable>
      <Heading3D size={58} depth={6}>
        {title}
      </Heading3D>
    </View>
  );
}

function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <Txt variant="bodyBold" role="alert">
      ✦ {children}
    </Txt>
  );
}

function syncLine(status: SyncStatus, pending: number, now: number): string {
  const ago = (t: number | null) => {
    if (!t) return 'never';
    const m = Math.floor((now - t) / 60_000);
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
  };
  switch (status.state) {
    case 'syncing':
      return 'Syncing…';
    case 'error':
      return `Couldn’t sync (last synced ${ago(status.lastSyncedAt)}). ${pending} change${pending === 1 ? '' : 's'} waiting.`;
    case 'idle':
      return pending > 0 ? `${pending} change${pending === 1 ? '' : 's'} waiting to sync` : `Synced ${ago(status.lastSyncedAt)}`;
    default:
      return 'Not syncing';
  }
}

function SignedIn() {
  const { user, signOut } = useAuth();
  const { sync, deleteAccount } = useRootline();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'out' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eraseDevice, setEraseDevice] = useState(false);
  const now = useNow(true, 30_000);
  const since = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Screen>
      <Header title={'Your\naccount'} />
      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Signed in as
        </Txt>
        <Txt variant="bodyBold">{user?.email ?? 'Google account'}</Txt>
        {since && (
          <Txt variant="caption" tone="inkSoft">
            Member since {since}
          </Txt>
        )}
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Sync
        </Txt>
        <Txt variant="bodyBold" role="status">
          {syncLine(sync.status, sync.pending, now)}
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          Your habits, check-ins, focus sessions, settings and a running timer stay the same on every device
          you sign in on.
        </Txt>
        {sync.status.state === 'error' && (
          <Txt variant="caption" tone="inkSoft">
            {sync.status.message}
          </Txt>
        )}
        <InkButton
          kind="outline"
          label="Sync now"
          disabled={sync.status.state === 'syncing'}
          onPress={() => sync.syncNow()}
        />
      </Card>

      <ErrorText>{error}</ErrorText>
      <InkButton
        kind="outline"
        label={busy === 'out' ? 'Signing out…' : 'Sign out'}
        disabled={!!busy}
        onPress={async () => {
          setBusy('out');
          // Send anything still waiting before signing out.
          await sync.syncNow();
          const result = await signOut();
          setBusy(null);
          if (result.error) setError(result.error);
        }}
      />
      <Txt variant="caption" tone="muted" style={styles.center}>
        Signing out keeps your data on this device.
      </Txt>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Delete account
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          Permanently deletes your account and everything synced to it, on every device. This can’t be undone.
        </Txt>
        <Toggle
          label="Also erase this device"
          detail="Otherwise your habits stay here, saved only on this device."
          value={eraseDevice}
          onChange={setEraseDevice}
        />
        <InkButton
          kind="outline"
          label={
            busy === 'delete' ? 'Deleting…' : confirmDelete ? 'Tap again to delete forever' : 'Delete my account'
          }
          disabled={!!busy}
          onPress={async () => {
            if (!confirmDelete) return setConfirmDelete(true);
            setBusy('delete');
            setError(null);
            const result = await deleteAccount(eraseDevice);
            setBusy(null);
            if (result.error) return setError(result.error);
            router.replace(eraseDevice ? '/welcome' : '/');
          }}
        />
      </Card>
    </Screen>
  );
}

function SignIn() {
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
    <Screen>
      <Header title={'Sign in'} />
      <Txt variant="bodyBold" tone="inkSoft">
        Keep your streaks safe and pick up on any device. Rootline also works without an account.
      </Txt>

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
    </Screen>
  );
}

export default function AccountScreen() {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <Screen>
        <ActivityIndicator style={styles.loading} />
      </Screen>
    );
  }
  return user ? <SignedIn /> : <SignIn />;
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -20 },
  moon: { position: 'absolute', right: 90, top: 30 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  group: { gap: Spacing.three },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: Spacing.three },
  or: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rule: { flex: 1, height: 1 },
  loading: { marginTop: Spacing.six },
  center: { textAlign: 'center' },
});
