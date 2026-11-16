import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { onStoredPeriod, usePeriodBudgetMutation } from '#period-budget';
import type { CategoryRowView, PaymentView, PeriodView } from '#period-budget';

import { lineStyle } from './layout';
import { Money } from './Money';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodPaymentsProps = {
  row: CategoryRowView;
  view: PeriodView;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

// The payments that count in a period, each at its real date. A payment dated
// outside the period says "early" or "late" in words.
export function PeriodPayments({
  row,
  view,
  data,
  labels,
}: PeriodPaymentsProps) {
  const { t } = useTranslation();
  const mutation = usePeriodBudgetMutation();
  const [movingId, setMovingId] = useState<string | null>(null);
  const targets = row.periods.filter(
    other => other.period.id !== view.period.id,
  );

  function countIn(payment: PaymentView, targetId: string) {
    const target = targets.find(other => other.period.id === targetId);
    if (!target) {
      return;
    }
    mutation.mutate(
      onStoredPeriod(target, id => ({
        name: 'period-budget/set-offset',
        args: { transactionId: payment.id, periodId: id },
      })),
      { onSuccess: () => setMovingId(null) },
    );
  }

  if (view.payments.length === 0) {
    return (
      <Text style={{ color: theme.pageTextSubdued }}>
        <Trans>No payment counts in this period.</Trans>
      </Text>
    );
  }

  return (
    <View role="list" style={{ gap: 6 }}>
      {view.payments.map(payment => {
        const payee = data.payeeName(payment.payee);
        const date = labels.day(payment.date);
        return (
          <View key={payment.id} role="listitem" style={{ gap: 4 }}>
            <View style={lineStyle}>
              <Text>{date}</Text>
              {payment.timing === 'early' && (
                <Text style={{ color: theme.warningText, fontWeight: 600 }}>
                  <Trans>early</Trans>
                </Text>
              )}
              {payment.timing === 'late' && (
                <Text style={{ color: theme.warningText, fontWeight: 600 }}>
                  <Trans>late</Trans>
                </Text>
              )}
              <Text style={{ flex: '1 1 120px' }}>{payee}</Text>
              <Text style={{ color: theme.pageTextSubdued }}>
                {data.accountName(payment.account)}
              </Text>
              <Money amount={payment.amount} />
              {payment.offset === 'manual' && (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>Counted here by your choice</Trans>
                </Text>
              )}
              {payment.offset === 'derived' && (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>Counted here because it pays a scheduled charge</Trans>
                </Text>
              )}
              {payment.offset === 'manual' && (
                <Button
                  aria-label={t('Count {{payee}} of {{date}} by its date', {
                    payee,
                    date,
                  })}
                  isDisabled={mutation.isPending}
                  onPress={() =>
                    mutation.mutate([
                      {
                        name: 'period-budget/clear-offset',
                        args: { transactionId: payment.id },
                      },
                    ])
                  }
                >
                  <Trans>Count by its date</Trans>
                </Button>
              )}
              {targets.length > 0 && (
                <Button
                  aria-label={t(
                    'Count {{payee}} of {{date}} in another period',
                    { payee, date },
                  )}
                  onPress={() => setMovingId(payment.id)}
                >
                  <Trans>Count in another period</Trans>
                </Button>
              )}
            </View>
            {movingId === payment.id && (
              <View style={lineStyle}>
                <Select
                  value=""
                  defaultLabel={t('Choose the period')}
                  options={targets.map((target): [string, string] => [
                    target.period.id,
                    labels.period(target.period),
                  ])}
                  disabled={mutation.isPending}
                  onChange={targetId => countIn(payment, targetId)}
                />
                <Button onPress={() => setMovingId(null)}>
                  <Trans>Cancel</Trans>
                </Button>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
