import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useIstel } from '@/state/store';

export default function TabsLayout() {
  const { settings } = useIstel();
  if (!settings.onboarded) return <Redirect href="/welcome" />;
  return <AppTabs />;
}
