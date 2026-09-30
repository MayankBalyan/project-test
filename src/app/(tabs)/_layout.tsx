import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useRootline } from '@/state/store';

export default function TabsLayout() {
  const { settings } = useRootline();
  if (!settings.onboarded) return <Redirect href="/welcome" />;
  return <AppTabs />;
}
