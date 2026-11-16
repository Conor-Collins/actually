import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { spentFraction } from '#period-budget';
import type { PeriodView } from '#period-budget';

import { BAR_HEIGHT, BAR_TOP, percent } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodBarProps = {
  view: PeriodView;
  // The part of the axis the period covers, from 0 to 1
  from: number;
  to: number;
  categoryName: string;
  labels: PeriodBudgetLabels;
  isSelected: boolean;
  onPress: () => void;
};

// A period on the timeline: a bar over its days, filled as far as its
// allowance is spent. Its label says the same in words.
export function PeriodBar({
  view,
  from,
  to,
  categoryName,
  labels,
  isSelected,
  onPress,
}: PeriodBarProps) {
  const { t } = useTranslation();
  const isOverspent = view.overspending > 0;
  const color = isOverspent ? theme.reportsRed : theme.reportsBlue;

  const parts = [
    t('{{category}}, {{period}}', {
      category: categoryName,
      period: labels.period(view.period),
    }),
    t('spent {{spent}} of {{allowance}}', {
      spent: labels.spokenMoney(view.spent),
      allowance: labels.spokenMoney(view.allowance),
    }),
    isOverspent
      ? t('overspent by {{amount}}', {
          amount: labels.spokenMoney(view.overspending),
        })
      : t('remaining {{amount}}', {
          amount: labels.spokenMoney(view.remaining),
        }),
  ];
  if (view.isActive) {
    parts.push(t('active'));
  }
  if (view.isPlanned) {
    parts.push(t('planned'));
  }

  return (
    <Button
      variant="bare"
      bounce={false}
      aria-label={parts.join(', ')}
      aria-expanded={isSelected}
      onPress={onPress}
      style={{
        position: 'absolute',
        left: percent(from),
        // Periods that follow each other stay apart
        width: `calc(${percent(to - from)} - 2px)`,
        top: BAR_TOP,
        height: BAR_HEIGHT,
        padding: 0,
        justifyContent: 'flex-start',
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px ${view.isPlanned ? 'dashed' : 'solid'} ${color}`,
        boxShadow: isSelected
          ? `0 0 0 2px ${theme.tableBorderSelected}`
          : undefined,
        backgroundColor: theme.tableBackground,
      }}
    >
      <View
        aria-hidden
        data-testid="period-spent"
        style={{
          alignSelf: 'stretch',
          backgroundColor: color,
          opacity: view.isPlanned ? 0.5 : 1,
        }}
        nativeStyle={{
          width: percent(spentFraction(view.allowance, view.spent)),
        }}
      />
    </Button>
  );
}
