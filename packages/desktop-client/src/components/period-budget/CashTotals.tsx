import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import type { CashForecast } from '#period-budget';

import { LabelledMoney } from './LabelledMoney';
import { lineStyle } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type CashTotalsProps = {
  forecast: CashForecast;
  labels: PeriodBudgetLabels;
};

// The cash in the selected accounts on the as-of day, and what the forecast
// expects it to be on its last day.
export function CashTotals({ forecast, labels }: CashTotalsProps) {
  const { t } = useTranslation();

  return (
    <View
      role="group"
      aria-label={t('Cash in the forecast')}
      style={{ ...lineStyle, alignItems: 'flex-start', gap: 24 }}
    >
      <LabelledMoney
        label={t('Balances together')}
        amount={forecast.cashAvailable}
        isBad={forecast.cashAvailable < 0}
      />
      <LabelledMoney
        label={t('Expected on {{date}}', {
          date: labels.day(forecast.horizonEnd),
        })}
        amount={forecast.projectedCash}
        isBad={forecast.projectedCash < 0}
      />
    </View>
  );
}
