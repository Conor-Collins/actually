import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { AccountForecast, Axis, CashForecast } from '#period-budget';

import { AccountPanel } from './AccountPanel';
import { AccountTrack } from './AccountTrack';
import { AmountCell } from './AmountCell';
import { AMOUNT_WIDTH, NAME_WIDTH } from './layout';
import { Money } from './Money';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AccountRowProps = {
  account: AccountForecast;
  forecast: CashForecast;
  axis: Axis;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  isOpen: boolean;
  onToggle: () => void;
};

// An account on the timeline: its name, its balances in the forecast, and
// its closing balance on the axis the periods are on. The opened row is
// shown in place under it.
export function AccountRow({
  account,
  forecast,
  axis,
  data,
  labels,
  isOpen,
  onToggle,
}: AccountRowProps) {
  const { t } = useTranslation();
  const name = data.accountName(account.accountId);

  return (
    <>
      <View
        role="row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderTop: `1px solid ${theme.tableBorder}`,
        }}
      >
        <View role="rowheader" style={{ width: NAME_WIDTH, flexShrink: 0 }}>
          <Button
            variant="bare"
            aria-expanded={isOpen}
            onPress={onToggle}
            style={{ justifyContent: 'flex-start' }}
          >
            <Text
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </Text>
          </Button>
        </View>
        <AmountCell
          amount={account.currentBalance}
          isBad={account.currentBalance < 0}
        />
        <AmountCell
          amount={account.minimumDailyClosingBalance}
          isBad={account.minimumDailyClosingBalance < 0}
        />
        <View
          role="cell"
          style={{
            width: AMOUNT_WIDTH,
            flexShrink: 0,
            alignItems: 'flex-end',
            paddingRight: 10,
          }}
        >
          {account.isForecast ? (
            <Money
              amount={account.transferNeeded}
              style={{
                color:
                  account.transferNeeded > 0 ? theme.errorText : theme.pageText,
              }}
            />
          ) : (
            <Text style={{ color: theme.pageTextSubdued }}>
              {t('not forecast')}
            </Text>
          )}
          {/* The first day the account is short */}
          {account.firstShortfallDate !== null && (
            <Text style={{ fontSize: 11, color: theme.errorText }}>
              {t('by {{date}}', {
                date: labels.day(account.firstShortfallDate),
              })}
            </Text>
          )}
        </View>
        <AmountCell
          amount={account.projectedEndingBalance}
          isBad={account.projectedEndingBalance < 0}
        />
        <View role="cell" style={{ flex: 1 }}>
          <AccountTrack
            account={account}
            forecast={forecast}
            axis={axis}
            name={name}
            labels={labels}
          />
        </View>
      </View>
      {isOpen && (
        <View role="row">
          <View role="cell" aria-colspan={6} style={{ padding: '4px 0 12px' }}>
            <AccountPanel
              account={account}
              forecast={forecast}
              data={data}
              labels={labels}
              onClose={onToggle}
            />
          </View>
        </View>
      )}
    </>
  );
}
