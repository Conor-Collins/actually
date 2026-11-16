import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { endAfter, isDay } from '#period-budget';

import { Field } from './Field';
import { useAmountText } from './useAmountText';

export type PeriodFormValues = {
  start: string;
  end: string; // the first day after the period
  budget: number;
};

type PeriodFormProps = {
  initial: { start: string; lastDay: string; budget: number };
  submitLabel: string;
  isPending: boolean;
  // The name of a period of the category that has a day in common with these
  // days, which the server would refuse
  overlapOf: (days: { start: string; end: string }) => string | null;
  onSubmit: (values: PeriodFormValues) => void;
  onCancel?: () => void;
};

// The dates and the allowance of one period. The form shows the last day of
// the period; what is stored is the day after it.
export function PeriodForm({
  initial,
  submitLabel,
  isPending,
  overlapOf,
  onSubmit,
  onCancel,
}: PeriodFormProps) {
  const { t } = useTranslation();
  const [start, setStart] = useState(initial.start);
  const [lastDay, setLastDay] = useState(initial.lastDay);
  const budget = useAmountText(initial.budget);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    // A press of Enter does not pass the disabled button
    if (isPending) {
      return;
    }
    if (!isDay(start) || !isDay(lastDay)) {
      setError(t('Enter the first and the last day of the period.'));
      return;
    }
    if (lastDay < start) {
      setError(t('The last day is before the first day.'));
      return;
    }
    const amount = budget.amount();
    if (amount === null) {
      setError(t('Enter an allowance that is not below zero.'));
      return;
    }
    const end = endAfter(lastDay);
    const overlapping = overlapOf({ start, end });
    if (overlapping !== null) {
      setError(
        t('These days overlap the period {{period}}.', {
          period: overlapping,
        }),
      );
      return;
    }
    setError(null);
    onSubmit({ start, end, budget: amount });
  }

  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        <Field label={t('First day')}>
          <Input
            type="date"
            value={start}
            onChangeValue={setStart}
            style={{ width: 150 }}
          />
        </Field>
        <Field label={t('Last day')}>
          <Input
            type="date"
            value={lastDay}
            onChangeValue={setLastDay}
            style={{ width: 150 }}
          />
        </Field>
        <Field label={t('Allowance')}>
          <Input
            inputMode="decimal"
            value={budget.text}
            onChangeValue={budget.setText}
            onEnter={submit}
            style={{ width: 120 }}
          />
        </Field>
        <Button variant="primary" isDisabled={isPending} onPress={submit}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button onPress={onCancel}>
            <Trans>Cancel</Trans>
          </Button>
        )}
      </View>
      {error !== null && (
        <Text role="alert" style={{ color: theme.errorText }}>
          {error}
        </Text>
      )}
    </View>
  );
}
