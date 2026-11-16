import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  findOverlappingPeriod,
  lastDayOf,
  onStoredPeriod,
  usePeriodBudgetMutation,
} from '#period-budget';
import type { CategoryRowView, PeriodRef, PeriodView } from '#period-budget';

import { LabelledMoney } from './LabelledMoney';
import { lineStyle } from './layout';
import { PanelFrame } from './PanelFrame';
import { PanelSection } from './PanelSection';
import { PeriodCharges } from './PeriodCharges';
import { PeriodForm } from './PeriodForm';
import type { PeriodFormValues } from './PeriodForm';
import { PeriodGraph } from './PeriodGraph';
import { PeriodPayments } from './PeriodPayments';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodPanelProps = {
  row: CategoryRowView;
  view: PeriodView;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  onClose: () => void;
  onOpenCategory: () => void;
  // A planned period was stored under another id
  onStored: (period: PeriodRef) => void;
};

// A period's opened row: its figures, its actions, its graph, and the
// payments and charges that count in it.
export function PeriodPanel({
  row,
  view,
  asOf,
  data,
  labels,
  onClose,
  onOpenCategory,
  onStored,
}: PeriodPanelProps) {
  const { t } = useTranslation();
  const { period } = view;
  const mutation = usePeriodBudgetMutation();
  // A planned period gets another id when it is stored. The opened row is
  // told at once, under the first day the period still has on the page.
  const storing = usePeriodBudgetMutation(id =>
    onStored({ id, start: period.start }),
  );
  const deleting = usePeriodBudgetMutation(onOpenCategory);
  const isPending =
    mutation.isPending || storing.isPending || deleting.isPending;
  const [isEditing, setIsEditing] = useState(false);
  const periodName = labels.period(period);

  function findPeriod(id: string | null): PeriodView | null {
    if (id === null) {
      return null;
    }
    return row.periods.find(other => other.period.id === id) ?? null;
  }
  const previous = findPeriod(view.previousId);
  const carriedFrom = findPeriod(view.carriedFrom);
  const hasCarry = period.carryover !== 0 || view.carriedFrom !== null;
  // A balance is carried between stored periods
  const carryFromPrevious =
    previous !== null &&
    !previous.isPlanned &&
    view.carriedFrom !== previous.period.id
      ? { id: previous.period.id, amount: previous.remaining }
      : null;

  function carry(fromPeriodId: string | null, amount: number) {
    mutation.mutate(
      onStoredPeriod(view, id => ({
        name: 'period-budget/carry',
        args: { id, fromPeriodId, amount },
      })),
    );
  }

  function save(values: PeriodFormValues) {
    if (view.isPlanned) {
      storing.mutate([
        {
          name: 'period-budget/create-period',
          args: { category: period.category, ...values },
        },
      ]);
      return;
    }
    const changes: { start?: string; end?: string; budget?: number } = {};
    if (values.start !== period.start) {
      changes.start = values.start;
    }
    if (values.end !== period.end) {
      changes.end = values.end;
    }
    if (values.budget !== period.budget) {
      changes.budget = values.budget;
    }
    if (Object.keys(changes).length === 0) {
      setIsEditing(false);
      return;
    }
    mutation.mutate(
      [
        {
          name: 'period-budget/update-period',
          args: { id: period.id, ...changes },
        },
      ],
      { onSuccess: () => setIsEditing(false) },
    );
  }

  return (
    <PanelFrame
      title={t('{{category}}, {{period}}', {
        category: row.category.name,
        period: periodName,
      })}
      onClose={onClose}
    >
      {(view.isActive || view.isPlanned) && (
        <Text style={{ color: theme.pageTextSubdued }}>
          {view.isPlanned ? (
            <Trans>
              This period follows from the repeating periods. It is stored when
              you change it.
            </Trans>
          ) : (
            <Trans>This period is active on the as-of day.</Trans>
          )}
        </Text>
      )}

      <View style={{ ...lineStyle, alignItems: 'flex-start', gap: 24 }}>
        <LabelledMoney label={t('Allowance')} amount={view.allowance} />
        <LabelledMoney label={t('Spent')} amount={view.spent} />
        <LabelledMoney
          label={t('Remaining')}
          amount={view.remaining}
          isBad={view.remaining < 0}
        />
        {view.overspending > 0 && (
          <LabelledMoney
            label={t('Overspent')}
            amount={view.overspending}
            isBad
          />
        )}
        <LabelledMoney
          label={t('Charges still expected')}
          amount={view.outstandingCharges}
        />
        <LabelledMoney
          label={t('Expected remaining')}
          amount={view.expectedRemaining}
          isBad={view.expectedRemaining < 0}
        />
      </View>

      {hasCarry && (
        <View style={lineStyle}>
          <PrivacyFilter>
            <Text>
              {carriedFrom
                ? t('carried {{amount}} from {{period}}', {
                    amount: labels.money(period.carryover),
                    period: labels.period(carriedFrom.period),
                  })
                : t('carried {{amount}} from a period that is gone', {
                    amount: labels.money(period.carryover),
                  })}
            </Text>
          </PrivacyFilter>
          {carriedFrom !== null &&
            view.carriedNow !== null &&
            view.carriedNow !== period.carryover && (
              <>
                <PrivacyFilter>
                  <Text style={{ color: theme.warningText }}>
                    {t('The balance of {{period}} is now {{amount}}.', {
                      period: labels.period(carriedFrom.period),
                      amount: labels.money(view.carriedNow),
                    })}
                  </Text>
                </PrivacyFilter>
                <Button
                  isDisabled={isPending}
                  onPress={() =>
                    carry(carriedFrom.period.id, carriedFrom.remaining)
                  }
                >
                  <Trans>Carry again</Trans>
                </Button>
              </>
            )}
          <Button isDisabled={isPending} onPress={() => carry(null, 0)}>
            <Trans>Remove the carried balance</Trans>
          </Button>
        </View>
      )}

      {isEditing ? (
        <PeriodForm
          initial={{
            start: period.start,
            lastDay: lastDayOf(period.end),
            budget: period.budget,
          }}
          submitLabel={t('Save')}
          isPending={isPending}
          overlapOf={days => {
            const overlapping = findOverlappingPeriod(
              data.rows?.periods ?? [],
              {
                id: view.isPlanned ? null : period.id,
                category: period.category,
                ...days,
              },
            );
            return overlapping && labels.period(overlapping);
          }}
          onSubmit={save}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <View style={lineStyle}>
          <Button onPress={() => setIsEditing(true)}>
            <Trans>Edit</Trans>
          </Button>
          {carryFromPrevious !== null && (
            <Button
              isDisabled={isPending}
              onPress={() =>
                carry(carryFromPrevious.id, carryFromPrevious.amount)
              }
            >
              <Trans>Carry balance from the previous period</Trans>
            </Button>
          )}
          <Button onPress={onOpenCategory}>
            <Trans>Link schedules</Trans>
          </Button>
          {!view.isPlanned && (
            <Button
              isDisabled={isPending}
              onPress={() =>
                deleting.mutate([
                  {
                    name: 'period-budget/delete-period',
                    args: { id: period.id },
                  },
                ])
              }
            >
              <Trans>Delete</Trans>
            </Button>
          )}
        </View>
      )}

      <PeriodGraph
        row={row}
        view={view}
        asOf={asOf}
        data={data}
        labels={labels}
      />

      <PanelSection title={t('Payments')}>
        <PeriodPayments row={row} view={view} data={data} labels={labels} />
      </PanelSection>
      <PanelSection title={t('Scheduled charges')}>
        <PeriodCharges view={view} data={data} labels={labels} />
      </PanelSection>
    </PanelFrame>
  );
}
