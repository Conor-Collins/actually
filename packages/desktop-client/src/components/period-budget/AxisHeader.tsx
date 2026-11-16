import { View } from '@actual-app/components/view';

import { axisMonths, axisPosition } from '#period-budget';
import type { Axis } from '#period-budget';

import { percent } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AxisHeaderProps = {
  axis: Axis;
  // What the column under the months holds
  label: string;
  labels: PeriodBudgetLabels;
};

// The header of the column with the axis: the name of each month where the
// month starts.
export function AxisHeader({ axis, label, labels }: AxisHeaderProps) {
  return (
    <View
      role="columnheader"
      aria-label={label}
      style={{ flex: 1, position: 'relative', height: 16 }}
    >
      {axisMonths(axis).map(month => (
        <View
          key={month}
          aria-hidden
          style={{ position: 'absolute', paddingLeft: 3 }}
          nativeStyle={{
            left: percent(axisPosition(axis, `${month}-01`)),
          }}
        >
          {labels.shortMonth(month)}
        </View>
      ))}
    </View>
  );
}
