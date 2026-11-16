import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { usePeriodBudgetMutation } from '#period-budget';

import { lineStyle } from './layout';
import { PanelSection } from './PanelSection';
import type { PeriodBudgetData } from './usePeriodBudgetData';

type AccountChoiceProps = {
  data: PeriodBudgetData;
  // The accounts the user left out, each with the way back in; otherwise
  // the accounts that are counted, each with the way out
  isLeftOut: boolean;
};

// The open budget accounts that are, or are not, in the cash forecast.
// Nothing when there is none.
export function AccountChoice({ data, isLeftOut }: AccountChoiceProps) {
  const { t } = useTranslation();
  const mutation = usePeriodBudgetMutation();
  const leftOutIds = new Set(
    (data.rows?.accounts ?? [])
      .filter(row => row.excluded && !row.tombstone)
      .map(row => row.id),
  );
  const accounts = data.accounts.filter(
    account =>
      account.closed === 0 &&
      account.offbudget === 0 &&
      leftOutIds.has(account.id) === isLeftOut,
  );

  if (accounts.length === 0) {
    return null;
  }

  return (
    <PanelSection
      title={
        isLeftOut ? t('Left out of the forecast') : t('Counted in the forecast')
      }
    >
      <View role="list" style={{ gap: 6 }}>
        {accounts.map(account => (
          <View key={account.id} role="listitem" style={lineStyle}>
            <Text style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              {account.name}
            </Text>
            <Button
              aria-label={
                isLeftOut
                  ? t('Include {{account}}', { account: account.name })
                  : t('Leave out {{account}}', { account: account.name })
              }
              isDisabled={mutation.isPending}
              onPress={() =>
                mutation.mutate([
                  isLeftOut
                    ? {
                        name: 'period-budget/include-account',
                        args: { accountId: account.id },
                      }
                    : {
                        name: 'period-budget/exclude-account',
                        args: { accountId: account.id },
                      },
                ])
              }
            >
              {isLeftOut ? t('Include') : t('Leave out')}
            </Button>
          </View>
        ))}
      </View>
    </PanelSection>
  );
}
