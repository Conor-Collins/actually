import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { ChargeView, PaymentView } from '#period-budget';

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

type ChargeFormProps = {
  charge: ChargeView;
  // The payments the user can name as the payment of the charge
  payments: PaymentView[];
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  isPending: boolean;
  onSubmit: (changes: ChargeChanges) => void;
  onCancel: () => void;
};

// The amount of one charge, what is still expected after a part payment, and
// which payment pays it.
export function ChargeForm({
  charge,
  payments,
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
  const [error, setError] = useState<string | null>(null);

  function submit() {
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
        <View style={{ gap: 3 }}>
          <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
            <Trans>Paid by</Trans>
          </Text>
          <Select
            value={paymentId}
            options={[
              ['', t('The payment that matches the schedule')],
              ...payments.map((payment): [string, string] => [
                payment.id,
                t('{{date}}, {{payee}}, {{amount}}', {
                  date: labels.day(payment.date),
                  payee: data.payeeName(payment.payee),
                  amount: labels.money(payment.amount),
                }),
              ]),
            ]}
            onChange={setPaymentId}
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
