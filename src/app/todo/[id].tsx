import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DuePicker } from '@/components/due-picker';
import { Heading3D } from '@/components/heading-3d';
import { Blob } from '@/components/ink-art';
import { Card, InkButton, Screen, TextField, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { LocalDate } from '@/core/dates';
import { Todo, TODO_NOTES_MAX, TODO_TITLE_MAX, validateTodo } from '@/core/todos';
import { useIstel } from '@/state/store';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/todos');
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Blob size={120} variant={3} stars={14} style={styles.blob} />
      <Pressable role="button" onPress={close} hitSlop={12} style={styles.back}>
        <Txt variant="label">← Back</Txt>
      </Pressable>
      <Heading3D size={54} depth={6}>
        {title}
      </Heading3D>
    </View>
  );
}

export default function EditTodoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { todos } = useIstel();
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return (
      <Screen>
        <Header title="Not found" />
        <Txt>This to-do doesn’t exist anymore.</Txt>
        <InkButton label="Back to to-dos" onPress={() => router.replace('/todos')} />
      </Screen>
    );
  }
  // Keyed so the form starts fresh if another to-do is opened in place.
  return <EditForm key={todo.id} todo={todo} />;
}

function EditForm({ todo }: { todo: Todo }) {
  const { today, todoActions } = useIstel();
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? '');
  const [dueDate, setDueDate] = useState<LocalDate | undefined>(todo.dueDate);
  const [dueTime, setDueTime] = useState<string | undefined>(todo.dueTime);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    const input = { title, notes, dueDate, dueTime };
    const problem = validateTodo(input);
    if (problem) return setError(problem);
    todoActions.update(todo.id, input);
    close();
  };

  return (
    <Screen>
      <Header title={'Edit\nto-do'} />
      <TextField label="To-do" value={title} onChangeText={setTitle} maxLength={TODO_TITLE_MAX} returnKeyType="done" />
      <TextField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything to remember"
        maxLength={TODO_NOTES_MAX}
        multiline
        style={styles.notes}
      />
      <Card style={styles.group}>
        <Txt variant="label" tone="inkSoft">
          Deadline
        </Txt>
        <DuePicker
          today={today}
          date={dueDate}
          time={dueTime}
          onChange={(d, t) => {
            setDueDate(d);
            setDueTime(t);
          }}
        />
      </Card>
      {error && (
        <Txt variant="bodyBold" role="alert">
          ✦ {error}
        </Txt>
      )}
      <InkButton label="Save changes" onPress={save} />
      <View style={styles.danger}>
        <InkButton
          kind="outline"
          label={todo.doneAt ? 'Mark as not done' : 'Mark as done'}
          onPress={() => {
            todoActions.toggleDone(todo.id);
            close();
          }}
        />
        <InkButton
          kind="outline"
          label={confirmDelete ? 'Tap again to delete' : 'Delete to-do'}
          onPress={() => {
            if (!confirmDelete) return setConfirmDelete(true);
            todoActions.remove(todo.id);
            close();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.three, paddingTop: Spacing.two },
  blob: { position: 'absolute', right: -40, top: -20 },
  back: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  notes: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
  group: { gap: Spacing.three },
  danger: { gap: Spacing.two, marginTop: Spacing.two },
});
