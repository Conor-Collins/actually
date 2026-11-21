import type { ComponentProps } from 'react';

import { View } from '@actual-app/components/view';

import { useGlobalPref } from '#hooks/useGlobalPref';

import { MonthPicker } from './MonthPicker';

type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

export function BudgetPageHeader({
  startMonth,
  onMonthSelect,
  numMonths,
  monthBounds,
}: BudgetPageHeaderProps) {
  const [expanded] = useGlobalPref('categoryExpandedState');
  const categoryColumn = 205 + 100 * (expanded ?? 0);

  return (
    <View
      style={{
        marginLeft: `clamp(5px, calc(100% - 360px), ${categoryColumn}px)`,
        marginRight: 5,
        flexShrink: 0,
      }}
    >
      <MonthPicker
        startMonth={startMonth}
        numDisplayed={numMonths}
        monthBounds={monthBounds}
        style={{ paddingBlock: 5 }}
        onSelect={onMonthSelect}
      />
    </View>
  );
}
