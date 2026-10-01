import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PlannedNotification } from '@/core/notify-plan';

export type Permission = 'granted' | 'denied' | 'undetermined';

/** Phones get real scheduled notifications, even when the app is closed. */
export const notificationReach: 'always' | 'while-open' = 'always';

// Show reminders as banners even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNELS = {
  habit: { id: 'reminders', name: 'Habit reminders' },
  streak: { id: 'streak', name: 'Streak at risk' },
  focus: { id: 'focus', name: 'Focus timer' },
  todo: { id: 'todos', name: 'To-do deadlines' },
} as const;

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  for (const c of Object.values(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      importance: c.id === 'focus' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getPermission(): Promise<Permission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function requestPermission(): Promise<boolean> {
  // Android 13+ only shows the permission prompt once a channel exists.
  await ensureChannels();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Replaces everything scheduled with the given plan. */
export async function applyPlan(plan: PlannedNotification[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getPermission()) !== 'granted') return;
  await ensureChannels();
  for (const n of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: { title: n.title, body: n.body, data: { kind: n.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNELS[n.kind].id },
    });
  }
}
