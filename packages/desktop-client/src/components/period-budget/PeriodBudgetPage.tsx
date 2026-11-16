import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { MobilePageHeader, Page } from '#components/Page';
import { SettingsBackButton } from '#components/settings/SettingsBackButton';
import {
  axisAround,
  axisMonthCount,
  isOnAxis,
  monthOf,
  yearAxis,
} from '#period-budget';

import { AsOfControls } from './AsOfControls';
import { MobilePeriodBudget } from './MobilePeriodBudget';
import { NeedsAttention } from './NeedsAttention';
import { PeriodBudgetFigures } from './PeriodBudgetFigures';
import type { Selection } from './selection';
import { Timeline } from './Timeline';
import { usePeriodBudgetData } from './usePeriodBudgetData';
import { usePeriodBudgetLabels } from './usePeriodBudgetLabels';

// Budgets by period: what is left of each category's allowance in the period
// that is active on the as-of day, next to the cash in the accounts. The
// budget page and its months are not changed by anything here.
export function PeriodBudgetPage() {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [asOf, setAsOf] = useState(() => monthUtils.currentDay());
  // The calendar year of the month that is looked at
  const [axis, setAxis] = useState(() =>
    yearAxis(monthOf(monthUtils.currentDay())),
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const data = usePeriodBudgetData({ asOf, axis });
  const labels = usePeriodBudgetLabels();
  const { view, error } = data;

  function changeAsOf(next: string) {
    setAsOf(next);
    if (!isOnAxis(axis, next)) {
      setAxis(axisAround(monthOf(next), axisMonthCount(axis)));
    }
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader
            title={t('Period Budget')}
            leftContent={<SettingsBackButton />}
          />
        ) : (
          t('Period Budget')
        )
      }
    >
      <View
        style={{
          flex: isNarrowWidth ? undefined : 1,
          overflowY: isNarrowWidth ? undefined : 'auto',
          gap: 16,
          paddingBottom: 20,
        }}
      >
        {error && (
          <Text role="alert" style={{ color: theme.errorText }}>
            {t('The period budget could not be calculated: {{error}}', {
              error: error.message,
            })}
          </Text>
        )}
        {view === null && !error && (
          <Text role="status" style={{ color: theme.pageTextSubdued }}>
            <Trans>Calculating the period budget</Trans>
          </Text>
        )}
        {view !== null && isNarrowWidth && (
          <MobilePeriodBudget
            view={view}
            asOf={asOf}
            onAsOfChange={changeAsOf}
            data={data}
            labels={labels}
            selection={selection}
            onSelect={setSelection}
          />
        )}
        {view !== null && !isNarrowWidth && (
          <>
            <AsOfControls
              asOf={asOf}
              onAsOfChange={changeAsOf}
              labels={labels}
            />
            <PeriodBudgetFigures view={view} labels={labels} />
            <NeedsAttention
              view={view}
              data={data}
              labels={labels}
              onOpenCategory={categoryId =>
                setSelection({ categoryId, period: null })
              }
            />
            <Timeline
              view={view}
              axis={axis}
              onAxisChange={setAxis}
              data={data}
              labels={labels}
              selection={selection}
              onSelect={setSelection}
            />
          </>
        )}
      </View>
    </Page>
  );
}
