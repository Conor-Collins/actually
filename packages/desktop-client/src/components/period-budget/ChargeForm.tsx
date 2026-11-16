import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { isDay, periodBudgetQueries } from '#period-budget';
import type { ChargeView } from '#period-budget';

import { Field } from './Field';
import { lineStyle } from './layout';
import { useAmountText } from './useAmountText';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

// The fields of a charge that the user changed
export type ChargeChanges = {
  amount?: number;
  openAmount?: number | null;
  transactionId?: string | null;
};

// The payments of this many days before and after the due date are listed
// until the user asks for other days.
const DAYS_AROUND = 31;

type ChargeFormProps = {
  charge: ChargeView;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  isPending: boolean;
  onSubmit: (changes: ChargeChanges) => void;
  onCancel: () => void;
};

// The amount of one charge, what is still expected after a part payment, and
// which payment pays it: any money that left an account, in any category and
// on any day, since the user asks for the days that are listed.
export function ChargeForm({
  charge,
  data,
  labels,
  isPending,
  onSubmit,
  onCancel,
}: ChargeFormProps) {
  const { t } = useTranslation();
  const storedOpenAmount = charge.override?.open_amount ?? null;
  const storedPaymentId = charge.override?.transaction_id ?? null;
  const amount = useAmountText(charge.amount);
  const openAmount = useAmountText(storedOpenAmount);
  const [paymentId, setPaymentId] = useState(storedPaymentId ?? '');
  const [from, setFrom] = useState(() =>
    monthUtils.subDays(charge.dueDate, DAYS_AROUND),
  );
  const [until, setUntil] = useState(() =>
    monthUtils.addDays(charge.dueDate, DAYS_AROUND),
  );
  const [error, setError] = useState<string | null>(null);
  const paymentsQuery = useQuery({
    ...periodBudgetQueries.nameablePayments({
      start: from,
      end: until,
      keepId: storedPaymentId,
    }),
    enabled: isDay(from) && isDay(until),
    // Keep the list while other days are fetched
    placeholderData: previous => previous,
  });
  const payments = paymentsQuery.data ?? [];

  function paymentLabel(payment: TransactionEntity) {
    const words = {
      date: labels.day(payment.date),
      payee: data.payeeName(payment.payee ?? null),
      account: data.accountName(payment.account),
    };
    // The text of a menu cannot be covered, so it has no amount then
    return labels.isMoneyHidden
      ? t('{{date}}, {{payee}}, {{account}}', words)
      : t('{{date}}, {{payee}}, {{account}}, {{amount}}', {
          ...words,
          amount: labels.money(payment.amount),
        });
  }

  function submit() {
    // A press of Enter does not pass the disabled button
    if (isPending) {
      return;
    }
    const newAmount = amount.amount();
    if (newAmount === null) {
      setError(t('Enter an expected amount that is not below zero.'));
      return;
    }
    const newOpenAmount = openAmount.amount();
    if (newOpenAmount === null && !openAmount.isEmpty) {
      setError(t('Enter a still expected amount that is not below zero.'));
      return;
    }
    const changes: ChargeChanges = {};
    if (newAmount !== charge.amount) {
      changes.amount = newAmount;
    }
    if (newOpenAmount !== storedOpenAmount) {
      changes.openAmount = newOpenAmount;
    }
    const newPaymentId = paymentId === '' ? null : paymentId;
    if (newPaymentId !== storedPaymentId) {
      changes.transactionId = newPaymentId;
    }
    setError(null);
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    onSubmit(changes);
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={{ ...lineStyle, alignItems: 'flex-end', gap: 10 }}>
        <Field label={t('Expected amount')}>
          <Input
            inputMode="decimal"
            value={amount.text}
            onChangeValue={amount.setText}
            onEnter={submit}
            style={{ width: 120 }}
          />
        </Field>
        <Field label={t('Still expected after a part payment')}>
          <Input
            inputMode="decimal"
            value={openAmount.text}
            onChangeValue={openAmount.setText}
            onEnter={submit}
            style={{ width: 120 }}
          />
        </Field>
        <Field label={t('Payments from')}>
          <Input
            type="date"
            value={from}
            onChangeValue={setFrom}
            style={{ width: 150 }}
          />
        </Field>
        <Field label={t('Payments until')}>
          <Input
            type="date"
            value={until}
            onChangeValue={setUntil}
            style={{ width: 150 }}
          />
        </Field>
        <View style={{ gap: 3, minWidth: 0, maxWidth: '100%' }}>
          <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
            <Trans>Paid by</Trans>
          </Text>
          <Select
            value={paymentId}
            options={[
              ['', t('The payment that matches the schedule')],
              ...payments.map((payment): [string, string] => [
                payment.id,
                paymentLabel(payment),
              ]),
            ]}
            onChange={setPaymentId}
            style={{ maxWidth: '100%' }}
          />
        </View>
        <Button variant="primary" isDisabled={isPending} onPress={submit}>
          <Trans>Save</Trans>
        </Button>
        <Button onPress={onCancel}>
          <Trans>Cancel</Trans>
        </Button>
      </View>
      {error !== null && (
        <Text role="alert" style={{ color: theme.errorText }}>
          {error}
        </Text>
      )}
    </View>
  );
}
