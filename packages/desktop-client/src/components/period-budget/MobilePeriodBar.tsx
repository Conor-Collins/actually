import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { periodProgress, spentFraction } from '#period-budget';
import type { PeriodView } from '#period-budget';

import { percent } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type MobilePeriodBarProps = {
  view: PeriodView;
  asOf: string;
  labels: PeriodBudgetLabels;
};

// A short bar for a phone: filled as far as the allowance is spent, with a
// mark at how far through the period the as-of day is.
export function MobilePeriodBar({ view, asOf, labels }: MobilePeriodBarProps) {
  const { t } = useTranslation();
  const progress = periodProgress(view.period, asOf);
  const color = view.overspending > 0 ? theme.reportsRed : theme.reportsBlue;

  return (
    <View
      role="img"
      aria-label={t(
        'Spent {{spent}} of {{allowance}}, {{percent}}% of the period has passed',
        {
          spent: labels.spokenMoney(view.spent),
          allowance: labels.spokenMoney(view.allowance),
          percent: Math.round(progress * 100),
        },
      )}
      style={{ height: 14, justifyContent: 'center' }}
    >
      <View
        style={{
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: theme.tableBackground,
        }}
        nativeStyle={{ border: `1px solid ${color}` }}
      >
        <View
          data-testid="period-spent"
          style={{ height: '100%' }}
          nativeStyle={{
            width: percent(spentFraction(view.allowance, view.spent)),
            backgroundColor: color,
          }}
        />
      </View>
      <View
        data-testid="period-progress"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: theme.pageTextDark,
        }}
        nativeStyle={{ left: percent(progress) }}
      />
    </View>
  );
}
