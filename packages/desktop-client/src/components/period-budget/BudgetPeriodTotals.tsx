import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useBudgetPeriodMonth } from './BudgetPeriods';
import { Money } from './Money';

export function BudgetPeriodTotals({ month }: { month: string }) {
  const { t } = useTranslation();
  const periods = useBudgetPeriodMonth(month)?.periods;
  const active = [...(periods?.values() ?? [])].filter(
    ({ view }) => view.isActive,
  );
  if (active.length === 0) {
    return null;
  }
  const totals = active.reduce(
    (totals, { view }) => ({
      budgeted: totals.budgeted + view.allowance,
      spent: totals.spent + view.spent,
      balance: totals.balance + view.remaining,
    }),
    { budgeted: 0, spent: 0, balance: 0 },
  );

  return (
    <View
      role="group"
      aria-label={t('Active multi-month period totals')}
      style={{
        padding: '6px 9px',
        gap: 3,
        backgroundColor: theme.tableRowHeaderBackground,
        borderTop: `1px solid ${theme.tableBorder}`,
        flex: 1,
      }}
    >
      <Text style={{ fontWeight: 600 }}>
        {t('Active multi-month periods ({{count}})', { count: active.length })}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '4px 10px' }}>
        <Text>
          <Trans>Budgeted</Trans> <Money amount={totals.budgeted} />
        </Text>
        <Text>
          <Trans>Spent</Trans> <Money amount={totals.spent} />
        </Text>
        <Text
          style={{ color: totals.balance < 0 ? theme.errorText : undefined }}
        >
          <Trans>Balance</Trans> <Money amount={totals.balance} />
        </Text>
      </View>
    </View>
  );
}
