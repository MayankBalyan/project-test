import { router } from 'expo-router';

import { HabitForm } from '@/components/habit-form';
import { useRootline } from '@/state/store';

export default function NewHabitScreen() {
  const { today, habitActions } = useRootline();
  return (
    <HabitForm
      title="New habit"
      today={today}
      submitLabel="Save habit"
      onSubmit={(input) => {
        habitActions.add(input);
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
