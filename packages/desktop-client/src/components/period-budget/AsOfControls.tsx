import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { isDay, monthOf } from '#period-budget';

import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AsOfControlsProps = {
  asOf: string;
  onAsOfChange: (asOf: string) => void;
  labels: PeriodBudgetLabels;
};

// The month and the as-of day. Another month is looked at on its last day,
// and the current month on today.
export function AsOfControls({
  asOf,
  onAsOfChange,
  labels,
}: AsOfControlsProps) {
  const { t } = useTranslation();
  const month = monthOf(asOf);
  const today = monthUtils.currentDay();

  function goToMonth(target: string) {
    onAsOfChange(
      target === monthOf(today) ? today : monthUtils.lastDayOfMonth(target),
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Button
        variant="bare"
        aria-label={t('Previous month')}
        onPress={() => goToMonth(monthUtils.prevMonth(month))}
      >
        <SvgCheveronLeft width={16} height={16} />
      </Button>
      <Text style={{ fontSize: 18, fontWeight: 600 }}>
        {labels.month(month)}
      </Text>
      <Button
        variant="bare"
        aria-label={t('Next month')}
        onPress={() => goToMonth(monthUtils.nextMonth(month))}
      >
        <SvgCheveronRight width={16} height={16} />
      </Button>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Text>
          <Trans>As of</Trans>
        </Text>
        <Input
          type="date"
          value={asOf}
          onChangeValue={value => {
            if (isDay(value)) {
              onAsOfChange(value);
            }
          }}
          style={{ width: 150 }}
        />
      </label>
      <Button isDisabled={asOf === today} onPress={() => onAsOfChange(today)}>
        <Trans>Today</Trans>
      </Button>
    </View>
  );
}
