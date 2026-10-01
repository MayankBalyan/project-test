import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhoneTopBar } from '@/components/account-button';
import { describeSchedule, HabitRow } from '@/components/habit-row';
import { Heading3D } from '@/components/heading-3d';
import { RainDrop } from '@/components/ink-art';
import { TodoRow } from '@/components/todo-row';
import { Card, InkButton, Screen, SectionTitle, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { toLocalDate, weekday } from '@/core/dates';
import { heatLevel } from '@/core/score';
import { streakStatus } from '@/core/streaks';
import { describeDue, groupTodos, isOverdue, todayTodos } from '@/core/todos';
import { useClock } from '@/hooks/use-clock';
import { useIsWide, usePalette } from '@/hooks/use-palette';
import { useIstel } from '@/state/store';

function formatShort(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatToday(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

export default function TodayRoute() {
  const { settings } = useIstel();
  // Focus-only people have no Today tab; send links to "/" to Focus.
  if (!settings.habitsEnabled) return <Redirect href="/focus" />;
  return <TodayScreen />;
}

function TodayScreen() {
  const palette = usePalette();
  const wide = useIsWide();
  const state = useIstel();
  const { global, habitStats, todayActivity } = state;
  const due = habitStats.filter((h) => h.scheduledToday);
  const { nowDate, nowMinutes } = useClock();
  const todoGroups = groupTodos(state.todos, state.today, nowMinutes, nowDate);
  const todayList = todayTodos(todoGroups, state.today, (ms) =>
    toLocalDate(new Date(ms), { timeZone, dayStartHour: state.settings.dayStartHour }),
  );
  const openTodos = todayList.filter((t) => !t.doneAt);
  const finishedTodos = todayList.filter((t) => t.doneAt);
  // Open ones first (a few), then everything already ticked off today, struck through.
  const shownTodos = [...openTodos.slice(0, DUE_TODOS_SHOWN), ...finishedTodos];
  const status = streakStatus(global, state.today);
  const week = state.days.slice(-7);
  const doneCount = due.filter((h) => h.done).length;

  return (
    <Screen>
      {!wide && <PhoneTopBar />}
      <View style={styles.head}>
        <View style={styles.headText}>
          <Txt variant="label" tone="inkSoft">
            {formatToday(state.today)} · score {todayActivity.score}
          </Txt>
          <Heading3D size={wide ? 64 : 52} depth={5}>
            Today
          </Heading3D>
        </View>
        <View style={styles.headStreak} aria-label={`${global.current}-day streak, best ${global.longest}`}>
          <Heading3D size={wide ? 56 : 46} depth={4}>
            {String(global.current)}
          </Heading3D>
          <Txt variant="caption" tone="inkSoft">
            day streak
          </Txt>
        </View>
      </View>

      <Pressable
        role="link"
        accessibilityLabel="This week. Open Streaks"
        onPress={() => router.navigate('/streaks')}
        style={({ pressed }) => [styles.week, { borderColor: palette.ink, backgroundColor: palette.surface, opacity: pressed ? 0.8 : 1 }]}>
        {week.map((d, i) => {
          const isToday = i === week.length - 1;
          return (
            <View key={d.date} style={styles.weekDay} aria-label={`${formatShort(d.date)}: score ${d.score}`}>
              <Txt variant="caption" tone={isToday ? 'ink' : 'muted'}>
                {WEEKDAY[weekday(d.date)]}
              </Txt>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: palette.heat[heatLevel(d.score)] },
                  isToday && { borderWidth: 2, borderColor: palette.ink },
                ]}
              />
            </View>
          );
        })}
      </Pressable>
      {status.rescuedOn && (
        <View style={styles.rescued}>
          <RainDrop size={14} filled color={palette.ink} />
          <Txt variant="caption" tone="inkSoft" style={styles.noteText}>
            A Rain Day covered {formatShort(status.rescuedOn)} and kept your streak alive.
          </Txt>
        </View>
      )}

      {todayList.length > 0 && (
        <View style={styles.section}>
          <SectionTitle
            right={
              <Pressable role="link" onPress={() => router.navigate('/todos')} hitSlop={8}>
                <Txt variant="label">All to-dos →</Txt>
              </Pressable>
            }>
            {`Due today · ${finishedTodos.length}/${todayList.length}`}
          </SectionTitle>
          {shownTodos.map((t) => (
            <TodoRow
              key={t.id}
              title={t.title}
              due={t.doneAt ? 'Done' : describeDue(t, state.today, nowMinutes, nowDate)}
              late={isOverdue(t, state.today, nowMinutes, nowDate)}
              done={!!t.doneAt}
              onToggle={() => state.todoActions.toggleDone(t.id)}
              onEdit={() => router.push({ pathname: '/todo/[id]', params: { id: t.id } })}
            />
          ))}
          {openTodos.length > DUE_TODOS_SHOWN && (
            <Txt variant="caption" tone="inkSoft">
              +{openTodos.length - DUE_TODOS_SHOWN} more on the To-do tab
            </Txt>
          )}
        </View>
      )}

      <View style={styles.section}>
        <SectionTitle
          right={
            due.length > 0 ? (
              <Txt variant="bodyBold">
                {doneCount}/{due.length}
              </Txt>
            ) : undefined
          }>
          Today&apos;s habits
        </SectionTitle>
        {habitStats.length === 0 ? (
          <Card style={styles.empty}>
            <Txt variant="section">No habits yet</Txt>
            <Txt variant="caption" tone="inkSoft">
              Start small. One habit you can do every day is enough to grow your first streak.
            </Txt>
            <InkButton label="Add your first habit" onPress={() => router.push('/habit/new')} />
          </Card>
        ) : (
          <>
            {due.length === 0 && (
              <Txt variant="caption" tone="inkSoft">
                Nothing due today. Enjoy the rest day.
              </Txt>
            )}
            {due.map(({ habit, done, value, streak }) => (
              <HabitRow
                key={habit.id}
                name={habit.name}
                detail={
                  (habit.kind === 'count'
                    ? `${value}/${habit.target} today · tap to add`
                    : habit.kind === 'duration'
                      ? `${value}/${habit.target} min today · tap to focus`
                      : describeSchedule(habit.schedule)) +
                  (habit.reminders?.length ? ` · reminds ${habit.reminders.join(', ')}` : '')
                }
                done={done}
                progress={habit.kind === 'check' ? undefined : Math.min(1, value / habit.target)}
                streak={streak.current}
                streakUnit={habit.schedule.type === 'timesPerWeek' ? 'weeks' : 'days'}
                onToggle={() =>
                  habit.kind === 'duration'
                    ? router.navigate({ pathname: '/focus', params: { habit: habit.id } })
                    : state.toggleHabit(habit.id)
                }
                onEdit={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
              />
            ))}
            <InkButton kind="outline" label="+ Add habit" onPress={() => router.push('/habit/new')} />
            <Txt variant="caption" tone="muted" style={styles.hint}>
              Tap to check off · ⋯ to edit or delete
            </Txt>
          </>
        )}
      </View>

    </Screen>
  );
}

const DUE_TODOS_SHOWN = 4;
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: Spacing.two },
  headText: { gap: Spacing.one, flexShrink: 1 },
  headStreak: { alignItems: 'flex-end' },
  week: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
  },
  weekDay: { alignItems: 'center', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15 },
  rescued: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: -Spacing.two },
  noteText: { flex: 1 },
  section: { gap: Spacing.two + 2 },
  empty: { gap: Spacing.two + 2 },
  hint: { textAlign: 'center' },
});
