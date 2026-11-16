import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { isDay, monthOf, usePeriodBudgetMutation } from '#period-budget';
import type { CategoryRowView } from '#period-budget';

import { CadenceForm } from './CadenceForm';
import { lineStyle } from './layout';
import { Money } from './Money';
import { PanelFrame } from './PanelFrame';
import { PanelSection } from './PanelSection';
import { PeriodForm } from './PeriodForm';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type CategoryPanelProps = {
  row: CategoryRowView;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  onClose: () => void;
};

// A category's opened row: how its periods repeat, adding one period, the
// schedules whose charges it expects, and what was deleted or is in no period.
export function CategoryPanel({
  row,
  asOf,
  data,
  labels,
  onClose,
}: CategoryPanelProps) {
  const { t } = useTranslation();
  const mutation = usePeriodBudgetMutation();
  const [isChangingCadence, setIsChangingCadence] = useState(false);
  const { category, cadence } = row;
  const monthStart = `${monthOf(asOf)}-01`;

  const repeating =
    cadence !== null &&
    cadence.active &&
    isDay(cadence.anchor_date) &&
    cadence.months !== null
      ? { anchorDate: cadence.anchor_date, months: cadence.months }
      : null;
  // The server takes an allowance with the cadence only for a category that
  // never had a period
  const hasNoPeriod =
    row.periods.length === 0 && row.deletedPeriods.length === 0;

  const storedPeriods = row.periods.filter(view => !view.isPlanned);
  const lastStored =
    storedPeriods.length > 0 ? storedPeriods[storedPeriods.length - 1] : null;
  const newStart = lastStored ? lastStored.period.end : monthStart;

  const linkedCategoryBySchedule = new Map<string, string>();
  for (const link of data.rows?.scheduleLinks ?? []) {
    if (!link.tombstone && link.category !== null) {
      linkedCategoryBySchedule.set(link.id, link.category);
    }
  }
  const unlinkedSchedules = data.schedules.filter(
    schedule =>
      !schedule.completed && !linkedCategoryBySchedule.has(schedule.id),
  );
  const suggestedSchedules = unlinkedSchedules.filter(
    schedule => data.suggestedCategories[schedule.id] === category.id,
  );
  const otherSchedules = unlinkedSchedules.filter(
    schedule => data.suggestedCategories[schedule.id] !== category.id,
  );

  function repeatingText(cadence: { anchorDate: string; months: number }) {
    const date = labels.day(cadence.anchorDate);
    if (cadence.months === 1) {
      return t('A new period starts every month, counted from {{date}}.', {
        date,
      });
    }
    if (cadence.months === 12) {
      return t('A new period starts every year, counted from {{date}}.', {
        date,
      });
    }
    return t(
      'A new period starts every {{months}} months, counted from {{date}}.',
      { months: cadence.months, date },
    );
  }

  function link(scheduleId: string) {
    mutation.mutate([
      {
        name: 'period-budget/link-schedule',
        args: { scheduleId, category: category.id },
      },
    ]);
  }

  return (
    <PanelFrame title={category.name} onClose={onClose}>
      <PanelSection title={t('Repeating periods')}>
        {repeating && !isChangingCadence ? (
          <View style={lineStyle}>
            <Text>{repeatingText(repeating)}</Text>
            <Button onPress={() => setIsChangingCadence(true)}>
              <Trans>Change</Trans>
            </Button>
            <Button
              isDisabled={mutation.isPending}
              onPress={() =>
                mutation.mutate([
                  {
                    name: 'period-budget/stop-cadence',
                    args: { category: category.id },
                  },
                ])
              }
            >
              <Trans>Stop repeating</Trans>
            </Button>
          </View>
        ) : (
          <>
            <Text style={{ color: theme.pageTextSubdued }}>
              {cadence !== null && !repeating ? (
                <Trans>
                  Repeating is stopped. The periods that exist stay as they are.
                </Trans>
              ) : (
                <Trans>
                  Each period starts when the one before it ends, and takes its
                  allowance from it.
                </Trans>
              )}
            </Text>
            <CadenceForm
              initial={{
                anchorDate: repeating?.anchorDate ?? monthStart,
                months: repeating?.months ?? cadence?.months ?? 1,
              }}
              hasBudget={hasNoPeriod}
              submitLabel={repeating ? t('Save') : t('Start repeating')}
              isPending={mutation.isPending}
              onSubmit={values =>
                mutation.mutate(
                  [
                    {
                      name: 'period-budget/set-cadence',
                      args: { category: category.id, ...values },
                    },
                  ],
                  { onSuccess: () => setIsChangingCadence(false) },
                )
              }
              onCancel={
                isChangingCadence
                  ? () => setIsChangingCadence(false)
                  : undefined
              }
            />
          </>
        )}
      </PanelSection>

      <PanelSection title={t('Add one period')}>
        <PeriodForm
          key={newStart}
          initial={{
            start: newStart,
            lastDay: monthUtils.lastDayOfMonth(newStart),
            budget: lastStored?.period.budget ?? 0,
          }}
          submitLabel={t('Add the period')}
          isPending={mutation.isPending}
          onSubmit={values =>
            mutation.mutate([
              {
                name: 'period-budget/create-period',
                args: { category: category.id, ...values },
              },
            ])
          }
        />
      </PanelSection>

      <PanelSection title={t('Scheduled charges')}>
        {row.linkedScheduleIds.length === 0 && (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              No schedule is linked. The charges of a linked schedule count as
              expected spending in the periods of this category.
            </Trans>
          </Text>
        )}
        {row.linkedScheduleIds.map(scheduleId => {
          const schedule = data.scheduleName(scheduleId);
          return (
            <View key={scheduleId} style={lineStyle}>
              <Text>{schedule}</Text>
              <Button
                aria-label={t('Unlink {{schedule}}', { schedule })}
                isDisabled={mutation.isPending}
                onPress={() =>
                  mutation.mutate([
                    {
                      name: 'period-budget/unlink-schedule',
                      args: { scheduleId },
                    },
                  ])
                }
              >
                <Trans>Unlink</Trans>
              </Button>
            </View>
          );
        })}
        {suggestedSchedules.map(schedule => {
          const name = data.scheduleName(schedule.id);
          return (
            <View key={schedule.id} style={lineStyle}>
              <Text>
                {t('{{schedule}} gets this category from the rules.', {
                  schedule: name,
                })}
              </Text>
              <Button
                aria-label={t('Link {{schedule}}', { schedule: name })}
                isDisabled={mutation.isPending}
                onPress={() => link(schedule.id)}
              >
                <Trans>Link</Trans>
              </Button>
            </View>
          );
        })}
        {otherSchedules.length > 0 && (
          <View style={lineStyle}>
            <Select
              value=""
              defaultLabel={t('Link another schedule')}
              options={otherSchedules.map((schedule): [string, string] => [
                schedule.id,
                data.scheduleName(schedule.id),
              ])}
              disabled={mutation.isPending}
              onChange={link}
            />
          </View>
        )}
      </PanelSection>

      {row.deletedPeriods.length > 0 && (
        <PanelSection title={t('Deleted periods')}>
          {row.deletedPeriods.map(deleted => {
            const period = labels.period({
              start: deleted.start_date ?? '',
              end: deleted.end_date ?? '',
            });
            return (
              <View key={deleted.id} style={lineStyle}>
                <Text>{period}</Text>
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>Allowance</Trans>
                </Text>
                <Money amount={deleted.budget ?? 0} />
                <Button
                  aria-label={t('Restore {{period}}', { period })}
                  isDisabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate([
                      {
                        name: 'period-budget/restore-period',
                        args: { id: deleted.id },
                      },
                    ])
                  }
                >
                  <Trans>Restore</Trans>
                </Button>
              </View>
            );
          })}
        </PanelSection>
      )}

      {row.unassigned.length > 0 && (
        <PanelSection title={t('Spending in no period')}>
          {row.unassigned.map(payment => (
            <View key={payment.id} style={lineStyle}>
              <Text>{labels.day(payment.date)}</Text>
              <Text>{data.payeeName(payment.payee)}</Text>
              <Money amount={payment.amount} />
            </View>
          ))}
        </PanelSection>
      )}

      {row.chargesWithoutPeriod.length > 0 && (
        <PanelSection title={t('Charges due in no period')}>
          {row.chargesWithoutPeriod.map(charge => (
            <View key={charge.id} style={lineStyle}>
              <Text>{labels.day(charge.dueDate)}</Text>
              <Text>{data.scheduleName(charge.scheduleId)}</Text>
              <Money amount={charge.amount} />
            </View>
          ))}
        </PanelSection>
      )}
    </PanelFrame>
  );
}
