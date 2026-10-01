import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DuePicker } from '@/components/due-picker';
import { Hero } from '@/components/hero';
import { Blob, Planet } from '@/components/ink-art';
import { TodoRow } from '@/components/todo-row';
import { Card, InkButton, Screen, SectionTitle, TextField, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { LocalDate } from '@/core/dates';
import { describeDue, groupTodos, isOverdue, Todo, TODO_TITLE_MAX, validateTodo } from '@/core/todos';
import { useClock } from '@/hooks/use-clock';
import { useIstel } from '@/state/store';

export default function TodosScreen() {
  const { todos, todoActions, today } = useIstel();
  const { nowDate, nowMinutes } = useClock();
  const groups = useMemo(() => groupTodos(todos, today, nowMinutes, nowDate), [todos, today, nowMinutes, nowDate]);
  const open = groups.overdue.length + groups.today.length + groups.upcoming.length + groups.someday.length;

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<LocalDate | undefined>();
  const [dueTime, setDueTime] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  // Bumped after each add so the deadline picker starts fresh (calendar closed).
  const [added, setAdded] = useState(0);

  const add = () => {
    const input = { title, dueDate, dueTime };
    const problem = validateTodo(input);
    if (problem) return setError(problem);
    todoActions.add(input);
    setTitle('');
    setDueDate(undefined);
    setDueTime(undefined);
    setError(null);
    setAdded((n) => n + 1);
  };

  const edit = (id: string) => router.push({ pathname: '/todo/[id]', params: { id } });
  const row = (t: Todo) => (
    <TodoRow
      key={t.id}
      title={t.title}
      due={describeDue(t, today, nowMinutes, nowDate)}
      late={isOverdue(t, today, nowMinutes, nowDate)}
      done={!!t.doneAt}
      hasNotes={!!t.notes}
      onToggle={() => todoActions.toggleDone(t.id)}
      onEdit={() => edit(t.id)}
    />
  );

  const section = (label: string, list: Todo[]) =>
    list.length > 0 && (
      <View style={styles.section}>
        <SectionTitle right={<Txt variant="bodyBold">{list.length}</Txt>}>{label}</SectionTitle>
        {list.map(row)}
      </View>
    );

  return (
    <Screen>
      <Hero
        title={'To\ndo'}
        subtitle={
          open === 0
            ? 'Nothing waiting. Add what’s on your mind and give it a deadline.'
            : `${open} to do${groups.overdue.length ? ` · ${groups.overdue.length} late` : ''}${groups.today.length ? ` · ${groups.today.length} due today` : ''}.`
        }
        art={
          <>
            <Blob size={140} variant={3} stars={16} style={styles.heroBlob} />
            <Planet size={96} style={styles.heroPlanet} />
          </>
        }
      />

      <Card style={styles.add}>
        <TextField
          label="New to-do"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (error) setError(null);
          }}
          placeholder="e.g. Send the report"
          maxLength={TODO_TITLE_MAX}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <Txt variant="label" tone="inkSoft">
          Deadline
        </Txt>
        <DuePicker
          key={added}
          today={today}
          date={dueDate}
          time={dueTime}
          onChange={(d, t) => {
            setDueDate(d);
            setDueTime(t);
          }}
        />
        {error && (
          <Txt variant="bodyBold" role="alert">
            ✦ {error}
          </Txt>
        )}
        <InkButton label="Add to-do" onPress={add} />
      </Card>

      {section('Late', groups.overdue)}
      {section('Today', groups.today)}
      {section('Coming up', groups.upcoming)}
      {section('No deadline', groups.someday)}

      {open === 0 && groups.done.length === 0 && (
        <Txt variant="caption" tone="muted" style={styles.center}>
          Tap a to-do to tick it off · ⋯ to edit or delete
        </Txt>
      )}

      {groups.done.length > 0 && (
        <View style={styles.section}>
          <View style={styles.doneHead}>
            <Pressable role="button" aria-expanded={showDone} onPress={() => setShowDone((v) => !v)} hitSlop={8}>
              <Txt variant="label">
                {showDone ? '▾' : '▸'} Done · {groups.done.length}
              </Txt>
            </Pressable>
            {showDone && (
              <Pressable
                role="button"
                onPress={() => todoActions.removeMany(groups.done.map((t) => t.id))}
                hitSlop={8}>
                <Txt variant="label" tone="inkSoft">
                  Clear done
                </Txt>
              </Pressable>
            )}
          </View>
          {showDone && groups.done.map(row)}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlob: { position: 'absolute', right: -40, top: 0 },
  heroPlanet: { position: 'absolute', right: 90, top: 30 },
  add: { gap: Spacing.three },
  section: { gap: Spacing.two },
  doneHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.one },
  center: { textAlign: 'center' },
});
