import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { isDay } from '#period-budget';

import { Field } from './Field';
import { useAmountText } from './useAmountText';

export type CadenceFormValues = {
  anchorDate: string;
  months: number;
  budget?: number;
};

type CadenceFormProps = {
  initial: { anchorDate: string; months: number };
  // Asked only for a category that has no period yet: the allowance of the
  // first period, which later periods copy
  hasBudget: boolean;
  submitLabel: string;
  isPending: boolean;
  onSubmit: (values: CadenceFormValues) => void;
  onCancel?: () => void;
};

// From which day periods repeat, and how many months each one lasts.
export function CadenceForm({
  initial,
  hasBudget,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: CadenceFormProps) {
  const { t } = useTranslation();
  const [anchorDate, setAnchorDate] = useState(initial.anchorDate);
  const [monthsText, setMonthsText] = useState(String(initial.months));
  const budget = useAmountText(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    // A press of Enter does not pass the disabled button
    if (isPending) {
      return;
    }
    if (!isDay(anchorDate)) {
      setError(t('Enter the first day of the first period.'));
      return;
    }
    const months = Number(monthsText);
    if (!Number.isInteger(months) || months < 1 || months > 120) {
      setError(t('Enter a length from 1 to 120 months.'));
      return;
    }
    if (!hasBudget) {
      setError(null);
      onSubmit({ anchorDate, months });
      return;
    }
    const amount = budget.amount();
    if (amount === null) {
      setError(t('Enter an allowance that is not below zero.'));
      return;
    }
    setError(null);
    onSubmit({ anchorDate, months, budget: amount });
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
        <Field label={t('First day of the first period')}>
          <Input
            type="date"
            value={anchorDate}
            onChangeValue={setAnchorDate}
            style={{ width: 150 }}
          />
        </Field>
        <Field label={t('Length in months')}>
          <Input
            type="number"
            min={1}
            max={120}
            value={monthsText}
            onChangeValue={setMonthsText}
            style={{ width: 90 }}
          />
        </Field>
        {hasBudget && (
          <Field label={t('Allowance of each period')}>
            <Input
              inputMode="decimal"
              value={budget.text}
              onChangeValue={budget.setText}
              onEnter={submit}
              style={{ width: 120 }}
            />
          </Field>
        )}
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
