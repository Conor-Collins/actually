import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { accountGroups } from '#period-budget';
import type { Axis } from '#period-budget';

import { AccountChoice } from './AccountChoice';
import { AccountRow } from './AccountRow';
import { AxisHeader } from './AxisHeader';
import { ForecastSummary } from './ForecastSummary';
import { AMOUNT_WIDTH, lineStyle, NAME_WIDTH } from './layout';
import { Money } from './Money';
import { useCashForecast } from './useCashForecast';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AccountsForecastProps = {
  asOf: string;
  axis: Axis;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

// The cash forecast under the timeline: the selected accounts, those with
// money in them and those that owe, each with its closing balance on the
// axis the periods are on.
export function AccountsForecast({
  asOf,
  axis,
  data,
  labels,
}: AccountsForecastProps) {
  const { t } = useTranslation();
  const { horizon, onHorizonChange, forecast } = useCashForecast(data);
  const [openId, setOpenId] = useState<string | null>(null);
  const amountHeaders = [
    t('Balance'),
    t('Lowest balance'),
    t('Transfer needed'),
    t('At the end'),
  ];
  const groupNames = {
    'in-accounts': t('In accounts'),
    owed: t('Owed'),
  };

  return (
    <View
      role="group"
      aria-label={t('Accounts')}
      style={{ gap: 10, minWidth: 900 }}
    >
      <Text style={{ fontSize: 15, fontWeight: 600 }}>
        <Trans>Accounts</Trans>
      </Text>
      <ForecastSummary
        asOf={asOf}
        horizon={horizon}
        onHorizonChange={onHorizonChange}
        forecast={forecast}
        data={data}
        labels={labels}
      />
      {forecast !== null && forecast.accounts.length > 0 && (
        <View role="table" aria-label={t('Accounts in the forecast')}>
          <View role="rowgroup">
            <View
              role="row"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                color: theme.pageTextSubdued,
                fontSize: 12,
                paddingBottom: 4,
              }}
            >
              <View
                role="columnheader"
                style={{ width: NAME_WIDTH, flexShrink: 0, paddingLeft: 5 }}
              >
                <Trans>Account</Trans>
              </View>
              {amountHeaders.map(header => (
                <View
                  key={header}
                  role="columnheader"
                  style={{
                    width: AMOUNT_WIDTH,
                    flexShrink: 0,
                    alignItems: 'flex-end',
                    paddingRight: 10,
                    textAlign: 'right',
                  }}
                >
                  {header}
                </View>
              ))}
              <AxisHeader
                axis={axis}
                label={t('Closing balances from {{start}} to {{end}}', {
                  start: labels.day(forecast.asOf),
                  end: labels.day(forecast.horizonEnd),
                })}
                labels={labels}
              />
            </View>
          </View>
          {accountGroups(forecast).map(group => (
            <View key={group.kind} role="rowgroup">
              <View
                role="row"
                style={{
                  borderTop: `1px solid ${theme.tableBorder}`,
                  backgroundColor: theme.tableRowHeaderBackground,
                }}
              >
                <View
                  role="rowheader"
                  aria-colspan={6}
                  style={{ ...lineStyle, padding: '5px', fontWeight: 600 }}
                >
                  <Text>{groupNames[group.kind]}</Text>
                  <Money amount={group.total} />
                </View>
              </View>
              {group.accounts.map(account => (
                <AccountRow
                  key={account.accountId}
                  account={account}
                  forecast={forecast}
                  axis={axis}
                  data={data}
                  labels={labels}
                  isOpen={openId === account.accountId}
                  onToggle={() =>
                    setOpenId(
                      openId === account.accountId ? null : account.accountId,
                    )
                  }
                />
              ))}
            </View>
          ))}
        </View>
      )}
      <AccountChoice data={data} isLeftOut />
    </View>
  );
}
