import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HabitForm } from '@/components/habit-form';
import { Heading3D } from '@/components/heading-3d';
import { InkButton, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useIstel } from '@/state/store';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { today, habits, habitActions } = useIstel();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const habit = habits.find((h) => h.id === id);

  if (!habit) {
    return (
      <Screen>
        <Heading3D size={54}>{'Not found'}</Heading3D>
        <Txt>This habit doesn&apos;t exist anymore.</Txt>
        <InkButton label="Back to today" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const archived = !!habit.archivedAt;

  return (
    <HabitForm
      title="Edit habit"
      initial={habit}
      today={today}
      submitLabel="Save changes"
      onSubmit={(input) => {
        habitActions.update(habit.id, input);
        close();
      }}>
      <View style={styles.danger}>
        <InkButton
          kind="outline"
          label={archived ? 'Restore habit' : 'Archive habit'}
          onPress={() => {
            habitActions.setArchived(habit.id, !archived);
            close();
          }}
        />
        <Txt variant="caption" tone="inkSoft" style={styles.note}>
          {archived
            ? 'Restoring brings it back to Today with its history.'
            : 'Archiving hides it from Today but keeps its history.'}
        </Txt>
        <InkButton
          kind="outline"
          label={confirmDelete ? 'Tap again to delete forever' : 'Delete habit'}
          onPress={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            habitActions.remove(habit.id);
            close();
          }}
        />
        <Txt variant="caption" tone="inkSoft" style={styles.note}>
          Deleting also removes every check-in for this habit.
        </Txt>
      </View>
    </HabitForm>
  );
}

const styles = StyleSheet.create({
  danger: { gap: Spacing.two, marginTop: Spacing.three },
  note: { textAlign: 'center' },
});
