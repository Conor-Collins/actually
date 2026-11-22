import { useContext, useState } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { BudgetPeriodDetail } from '#components/period-budget/BudgetPeriodDetail';
import { useBudgetPeriodMonths } from '#components/period-budget/BudgetPeriods';
import { BudgetPeriodSnapshot } from '#components/period-budget/BudgetPeriodSnapshot';
import { useGlobalPref } from '#hooks/useGlobalPref';

import { MonthsContext } from './MonthsContext';
import { RenderMonths } from './RenderMonths';

export function BudgetPeriodRow({ categoryId }: { categoryId: string }) {
  const [expanded] = useGlobalPref('categoryExpandedState');
  const { months } = useContext(MonthsContext);
  const periodMonths = useBudgetPeriodMonths();
  const [openedMonth, setOpenedMonth] = useState<string | null>(null);
  const opened =
    openedMonth && months.includes(openedMonth)
      ? periodMonths.get(openedMonth)
      : undefined;
  const openedEntry = opened?.periods.get(categoryId);

  return (
    <>
      <View style={{ flexDirection: 'row', minHeight: 46 }}>
        <View
          style={{
            width: 200 + 100 * (expanded ?? 0),
            flexShrink: 0,
            justifyContent: 'center',
            paddingLeft: 18,
            borderTop: `1px solid ${theme.tableBorder}`,
          }}
        >
          <Text style={{ fontSize: 11, color: theme.pageTextSubdued }}>
            <Trans>Period snapshot</Trans>
          </Text>
        </View>
        <RenderMonths>
          {({ month }) => {
            const monthly = periodMonths.get(month);
            const entry = monthly?.periods.get(categoryId);
            return (
              monthly &&
              entry && (
                <BudgetPeriodSnapshot
                  entry={entry}
                  data={monthly.data}
                  asOf={monthly.asOf}
                  isOpen={openedMonth === month}
                  onPress={() =>
                    setOpenedMonth(openedMonth === month ? null : month)
                  }
                />
              )
            );
          }}
        </RenderMonths>
      </View>
      {opened && openedEntry && (
        <BudgetPeriodDetail
          key={openedMonth}
          entry={openedEntry}
          data={opened.data}
          asOf={opened.asOf}
          onClose={() => setOpenedMonth(null)}
        />
      )}
    </>
  );
}
