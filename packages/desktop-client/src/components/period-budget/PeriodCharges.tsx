import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { usePeriodBudgetMutation } from '#period-budget';
import type {
  CategoryRowView,
  ChargeView,
  PaymentView,
  PeriodView,
} from '#period-budget';

import { ChargeForm } from './ChargeForm';
import type { ChargeChanges } from './ChargeForm';
import { lineStyle } from './layout';
import { Money } from './Money';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodChargesProps = {
  row: CategoryRowView;
  view: PeriodView;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

// A payment this many days before or after a charge can be named as its
// payment.
const NAMEABLE_DAYS = 62;

// The scheduled charges that are due in a period, with what the user can
// change about each: skip it, its amount, and which payment pays it.
export function PeriodCharges({ row, view, data, labels }: PeriodChargesProps) {
  const { t } = useTranslation();
  const mutation = usePeriodBudgetMutation();
  const [editingId, setEditingId] = useState<string | null>(null);

  function override(
    charge: ChargeView,
    changes: ChargeChanges & { skipped?: boolean },
  ) {
    mutation.mutate(
      [
        {
          name: 'period-budget/set-charge-override',
          args: {
            scheduleId: charge.scheduleId,
            dueDate: charge.dueDate,
            ...changes,
          },
        },
      ],
      { onSuccess: () => setEditingId(null) },
    );
  }

  function status(charge: ChargeView) {
    if (charge.status === 'paid') {
      return charge.paymentDate === null
        ? t('paid')
        : t('paid on {{date}}', { date: labels.day(charge.paymentDate) });
    }
    if (charge.status === 'skipped') {
      return t('skipped');
    }
    if (charge.status === 'closed') {
      return t('no longer expected');
    }
    return charge.isOverdue ? t('overdue') : t('expected');
  }

  function nameablePayments(charge: ChargeView): PaymentView[] {
    const payments = [
      ...row.periods.flatMap(period => period.payments),
      ...row.unassigned,
    ];
    return payments.filter(
      payment =>
        payment.id === charge.override?.transaction_id ||
        Math.abs(
          monthUtils.differenceInCalendarDays(payment.date, charge.dueDate),
        ) <= NAMEABLE_DAYS,
    );
  }

  if (view.charges.length === 0) {
    return (
      <Text style={{ color: theme.pageTextSubdued }}>
        <Trans>No scheduled charge is due in this period.</Trans>
      </Text>
    );
  }

  return (
    <View role="list" style={{ gap: 6 }}>
      {view.charges.map(charge => {
        const schedule = data.scheduleName(charge.scheduleId);
        const date = labels.day(charge.dueDate);
        return (
          <View key={charge.id} role="listitem" style={{ gap: 4 }}>
            <View style={lineStyle}>
              <Text>{date}</Text>
              <Text style={{ flex: '1 1 120px' }}>{schedule}</Text>
              <Money amount={charge.amount} />
              <Text
                style={{
                  fontWeight: 600,
                  color: charge.isOverdue
                    ? theme.errorText
                    : theme.pageTextSubdued,
                }}
              >
                {status(charge)}
              </Text>
              {charge.openAmount > 0 && (
                <>
                  <Text style={{ color: theme.pageTextSubdued }}>
                    <Trans>Still expected</Trans>
                  </Text>
                  <Money amount={charge.openAmount} />
                </>
              )}
              {charge.status === 'expected' && (
                <Button
                  aria-label={t('Skip {{schedule}} of {{date}}', {
                    schedule,
                    date,
                  })}
                  isDisabled={mutation.isPending}
                  onPress={() => override(charge, { skipped: true })}
                >
                  <Trans>Skip</Trans>
                </Button>
              )}
              {charge.status === 'skipped' && (
                <Button
                  aria-label={t('Do not skip {{schedule}} of {{date}}', {
                    schedule,
                    date,
                  })}
                  isDisabled={mutation.isPending}
                  onPress={() => override(charge, { skipped: false })}
                >
                  <Trans>Do not skip</Trans>
                </Button>
              )}
              <Button
                aria-label={t('Change {{schedule}} of {{date}}', {
                  schedule,
                  date,
                })}
                onPress={() => setEditingId(charge.id)}
              >
                <Trans>Change</Trans>
              </Button>
              {charge.override !== null && (
                <Button
                  aria-label={t(
                    'Remove the changes to {{schedule}} of {{date}}',
                    {
                      schedule,
                      date,
                    },
                  )}
                  isDisabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate([
                      {
                        name: 'period-budget/clear-charge-override',
                        args: { id: charge.id },
                      },
                    ])
                  }
                >
                  <Trans>Remove changes</Trans>
                </Button>
              )}
            </View>
            {editingId === charge.id && (
              <ChargeForm
                charge={charge}
                payments={nameablePayments(charge)}
                data={data}
                labels={labels}
                isPending={mutation.isPending}
                onSubmit={changes => override(charge, changes)}
                onCancel={() => setEditingId(null)}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
