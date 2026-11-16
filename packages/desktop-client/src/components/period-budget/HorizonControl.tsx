import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { CASH_HORIZONS, cashHorizonEnd } from '#period-budget';
import type { CashHorizon } from '#period-budget';

import { lineStyle } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type HorizonControlProps = {
  asOf: string;
  horizon: CashHorizon;
  onHorizonChange: (horizon: CashHorizon) => void;
  labels: PeriodBudgetLabels;
};

// How far ahead the cash forecast looks.
export function HorizonControl({
  asOf,
  horizon,
  onHorizonChange,
  labels,
}: HorizonControlProps) {
  const { t } = useTranslation();
  const names: Record<CashHorizon, string> = {
    'this-month': t('End of this month'),
    'next-month': t('End of next month'),
    '90-days': t('In 90 days'),
    '12-months': t('In 12 months'),
  };

  return (
    <View role="group" aria-label={t('Forecast until')} style={lineStyle}>
      <Text>
        <Trans>Forecast until</Trans>
      </Text>
      {CASH_HORIZONS.map(option => (
        <Button
          key={option}
          aria-pressed={option === horizon}
          style={{ fontWeight: option === horizon ? 600 : 400 }}
          onPress={() => onHorizonChange(option)}
        >
          {names[option]}
        </Button>
      ))}
      <Text style={{ color: theme.pageTextSubdued }}>
        {t('From {{start}} to {{end}}', {
          start: labels.day(asOf),
          end: labels.day(cashHorizonEnd(asOf, horizon)),
        })}
      </Text>
    </View>
  );
}
