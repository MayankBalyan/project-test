import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Heading3D } from '@/components/heading-3d';
import { Blob } from '@/components/ink-art';
import { Card, Chip, InkButton, Screen, Stepper, TextField, Toggle, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { toCsvExport, toJsonExport } from '@/core/export';
import { ISLAND_NAME_MAX } from '@/core/starters';
import { useInstall } from '@/lib/pwa';
import { getPermission, notificationReach, Permission, requestPermission } from '@/lib/notifications';
import { shareTextFile } from '@/lib/share-file';
import { openSitePage, siteLinks, SUPPORT_EMAIL } from '@/lib/site';
import { useIstel } from '@/state/store';
import { setThemePreference, ThemePreference, useThemePreference } from '@/state/theme';

const appVersion = Constants.expoConfig?.version ?? '';

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function formatHour(h: number) {
  if (h === 0) return 'midnight';
  return `${h}:00 AM`;
}

function formatEveningHour(h: number) {
  return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Web only: install Istel as an app from Chrome, Edge or Android. */
function InstallCard() {
  const { state, install } = useInstall();
  if (!state) return null;
  return (
    <Card style={styles.group}>
      <Txt variant="label" tone="inkSoft">
        Install app
      </Txt>
      {state === 'installed' ? (
        <Txt variant="caption" tone="inkSoft">
          Istel is installed on this device. Open it from your apps, dock or home screen.
        </Txt>
      ) : (
        <>
          <Txt variant="caption" tone="inkSoft">
            Get Istel in its own window with an icon on your desktop or home screen. It opens even when you’re
            offline.
          </Txt>
          {state === 'available' ? (
            <InkButton label="Install Istel" onPress={install} />
          ) : (
            <Txt variant="caption" tone="inkSoft">
              In Chrome or Edge, click the install icon at the right of the address bar, or open the ⋮ menu and choose
              “Install Istel”. On iPhone, tap Share → Add to Home Screen.
            </Txt>
          )}
        </>
      )}
    </Card>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings, habits, events, sessions, today, eraseAll, refreshNotifications } = useIstel();
  const [permission, setPermission] = useState<Permission | null>(null);
  const theme = useThemePreference();

  useEffect(() => {
    getPermission().then(setPermission);
  }, []);

  const allow = async () => {
    await requestPermission();
    setPermission(await getPermission());
    refreshNotifications();
  };

  const notify = settings.notifications;
  const setNotify = (patch: Partial<typeof notify>) => {
    updateSettings({ notifications: { ...notify, ...patch } });
    if (permission === 'undetermined') allow();
  };
  const [islandName, setIslandName] = useState(settings.islandName);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);

  const saveName = () => {
    const name = islandName.trim();
    if (name) updateSettings({ islandName: name });
    else setIslandName(settings.islandName);
  };

  const exportAs = async (format: 'json' | 'csv') => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings,
      habits,
      events,
      sessions,
    };
    try {
      await shareTextFile(
        `istel-${today}.${format}`,
        format === 'json' ? toJsonExport(data) : toCsvExport(data),
        format === 'json' ? 'application/json' : 'text/csv',
      );
      setStatus(`Exported istel-${today}.${format}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Blob size={120} variant={1} stars={14} style={styles.blob} />
        <Pressable role="button" onPress={close} hitSlop={12} style={styles.back}>
          <Txt variant="label">← Back</Txt>
        </Pressable>
        <Heading3D size={58} depth={6}>
          {'Settings'}
        </Heading3D>
      </View>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Appearance
        </Txt>
        <View style={styles.row} role="radiogroup" aria-label="Appearance">
          {THEMES.map((t) => (
            <Chip key={t.value} label={t.label} selected={theme === t.value} onPress={() => setThemePreference(t.value)} />
          ))}
        </View>
        <Txt variant="caption" tone="inkSoft">
          System follows your {Platform.OS === 'web' ? 'computer or phone' : 'phone'}’s light or dark setting.
        </Txt>
      </Card>

      <InstallCard />

      <Card style={styles.group}>
        <TextField
          label="Island name"
          value={islandName}
          onChangeText={setIslandName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          maxLength={ISLAND_NAME_MAX}
          returnKeyType="done"
        />
        <Txt variant="label" tone="inkSoft">
          Default focus length
        </Txt>
        <View style={styles.row}>
          {[25, 50, 90].map((m) => (
            <Chip
              key={m}
              label={`${m} min`}
              selected={settings.focusMinutes === m}
              onPress={() => updateSettings({ focusMinutes: m })}
            />
          ))}
        </View>
        <Toggle
          label="Stay Focused mode"
          detail="Leaving the app for more than 10 seconds during a session wilts its plant."
          value={settings.stayFocused}
          onChange={(v) => updateSettings({ stayFocused: v })}
        />
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          New day starts at
        </Txt>
        <Stepper
          label="day start hour"
          value={settings.dayStartHour}
          min={0}
          max={6}
          unit={formatHour(settings.dayStartHour)}
          onChange={(h) => updateSettings({ dayStartHour: h })}
        />
        <Txt variant="caption" tone="inkSoft">
          Anything you do before this time counts for the day before, so late nights don’t break your streak.
        </Txt>
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Notifications
        </Txt>
        <Toggle
          label="Streak at risk"
          detail="An evening nudge if nothing has counted toward your streak yet."
          value={notify.streakAtRisk}
          onChange={(v) => setNotify({ streakAtRisk: v })}
        />
        {notify.streakAtRisk && (
          <Stepper
            label="streak nudge hour"
            value={notify.streakAtRiskHour}
            min={17}
            max={23}
            format={(h) => String(h > 12 ? h - 12 : h)}
            unit={`${formatEveningHour(notify.streakAtRiskHour)}`}
            onChange={(h) => setNotify({ streakAtRiskHour: h })}
          />
        )}
        <Toggle
          label="Focus finished"
          detail="Tells you when a focus session ends, even if you left the app."
          value={notify.focusEnd}
          onChange={(v) => setNotify({ focusEnd: v })}
        />
        <Txt variant="caption" tone="inkSoft">
          Habit reminders are set on each habit.
        </Txt>
        {permission === 'denied' && (
          <Txt variant="bodyBold" role="alert">
            ✦ Notifications are blocked for Istel. Allow them in your device or browser settings.
          </Txt>
        )}
        {permission === 'undetermined' && <InkButton label="Allow notifications" onPress={allow} />}
        {notificationReach === 'while-open' && (
          <Txt variant="caption" tone="muted">
            In the browser, notifications only show while Istel is open in a tab. Install the phone app for
            reminders at any time.
          </Txt>
        )}
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Your data
        </Txt>
        <Txt variant="caption" tone="inkSoft">
          Everything is saved on this device. Export a copy any time.
        </Txt>
        <View style={styles.row}>
          <InkButton kind="outline" label="Export JSON" onPress={() => exportAs('json')} style={styles.half} />
          <InkButton kind="outline" label="Export CSV" onPress={() => exportAs('csv')} style={styles.half} />
        </View>
        {status && (
          <Txt variant="caption" role="status">
            {status}
          </Txt>
        )}
        <InkButton
          kind="outline"
          label={confirmErase ? 'Tap again to erase everything' : 'Erase all data on this device'}
          onPress={() => {
            if (!confirmErase) return setConfirmErase(true);
            eraseAll();
            // Back to the tabs, which send a not-yet-set-up app to /welcome.
            if (router.canDismiss()) router.dismissAll();
            else router.replace('/');
          }}
        />
        <Txt variant="caption" tone="muted">
          Erasing removes every habit, check-in, focus session and your island from this device. Your account keeps
          a copy and it syncs back; delete the account to remove that too.
        </Txt>
      </Card>

      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          About
        </Txt>
        <View style={styles.links}>
          <Pressable role="link" onPress={() => openSitePage(siteLinks.privacy)} hitSlop={8}>
            <Txt variant="label">Privacy policy ↗</Txt>
          </Pressable>
          <Pressable role="link" onPress={() => openSitePage(siteLinks.deleteAccount)} hitSlop={8}>
            <Txt variant="label">Delete your account ↗</Txt>
          </Pressable>
          <Pressable role="link" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} hitSlop={8}>
            <Txt variant="label">Help · {SUPPORT_EMAIL}</Txt>
          </Pressable>
        </View>
        <Txt variant="caption" tone="muted">
          Istel {appVersion}
        </Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -20 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  group: { gap: Spacing.three },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  half: { flexGrow: 1, flexBasis: 140 },
  links: { gap: Spacing.three },
});
