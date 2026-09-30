import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob, Moon } from '@/components/ink-art';
import { ErrorText } from '@/components/sign-in-form';
import { Card, InkButton, Screen, Toggle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/state/auth';
import { useNow, useIstel } from '@/state/store';
import type { SyncStatus } from '@/state/use-sync';

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
  const { sync, deleteAccount } = useIstel();
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
        Signing out takes you back to the sign-in screen. Sign in again to pick up where you left off.
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
          detail="Otherwise a copy stays on this device and joins the next account you sign in with."
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
            // On success the user is signed out and taken to the sign-in screen.
            if (result.error) setError(result.error);
          }}
        />
      </Card>
    </Screen>
  );
}

export default function AccountScreen() {
  // Only reachable while signed in (see the protected routes in app/_layout.tsx).
  return <SignedIn />;
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -20 },
  moon: { position: 'absolute', right: 90, top: 30 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  group: { gap: Spacing.three },
  center: { textAlign: 'center' },
});
