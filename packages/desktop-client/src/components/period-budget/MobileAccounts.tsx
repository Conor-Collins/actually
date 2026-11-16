import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { accountGroups } from '#period-budget';

import { AccountChoice } from './AccountChoice';
import { AccountPanel } from './AccountPanel';
import { ForecastSummary } from './ForecastSummary';
import { LabelledMoney } from './LabelledMoney';
import { lineStyle } from './layout';
import { Money } from './Money';
import { useCashForecast } from './useCashForecast';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type MobileAccountsProps = {
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

// The cash forecast on a phone: the figures of each selected account, and
// an account's payments, income and transfers when it is opened.
export function MobileAccounts({ asOf, data, labels }: MobileAccountsProps) {
  const { t } = useTranslation();
  const { horizon, onHorizonChange, forecast } = useCashForecast(data);
  const [openId, setOpenId] = useState<string | null>(null);
  const open =
    forecast?.accounts.find(account => account.accountId === openId) ?? null;
  const groupNames = {
    'in-accounts': t('In accounts'),
    owed: t('Owed'),
  };

  if (forecast !== null && open !== null) {
    return (
      <AccountPanel
        account={open}
        forecast={forecast}
        data={data}
        labels={labels}
        onClose={() => setOpenId(null)}
      />
    );
  }

  return (
    <>
      <ForecastSummary
        asOf={asOf}
        horizon={horizon}
        onHorizonChange={onHorizonChange}
        forecast={forecast}
        data={data}
        labels={labels}
      />
      {forecast !== null &&
        accountGroups(forecast).map(group => (
          <View
            key={group.kind}
            role="group"
            aria-label={groupNames[group.kind]}
            style={{ gap: 6 }}
          >
            <View style={lineStyle}>
              <Text style={{ fontWeight: 600 }}>{groupNames[group.kind]}</Text>
              <Money amount={group.total} style={{ fontWeight: 600 }} />
            </View>
            <View role="list" style={{ gap: 6 }}>
              {group.accounts.map(account => (
                <View
                  key={account.accountId}
                  role="listitem"
                  style={{
                    gap: 6,
                    padding: 10,
                    backgroundColor: theme.tableBackground,
                  }}
                >
                  <Button
                    variant="bare"
                    aria-expanded={false}
                    onPress={() => setOpenId(account.accountId)}
                    style={{
                      justifyContent: 'flex-start',
                      minWidth: 0,
                      padding: 0,
                      textAlign: 'left',
                    }}
                  >
                    <Text
                      style={{
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        fontWeight: 600,
                      }}
                    >
                      {data.accountName(account.accountId)}
                    </Text>
                  </Button>
                  <View
                    style={{ ...lineStyle, alignItems: 'flex-start', gap: 24 }}
                  >
                    <LabelledMoney
                      label={t('Balance')}
                      amount={account.currentBalance}
                      isBad={account.currentBalance < 0}
                    />
                    <LabelledMoney
                      label={t('Lowest balance')}
                      amount={account.minimumDailyClosingBalance}
                      isBad={account.minimumDailyClosingBalance < 0}
                    />
                    <LabelledMoney
                      label={t('At the end')}
                      amount={account.projectedEndingBalance}
                      isBad={account.projectedEndingBalance < 0}
                    />
                    {account.transferNeeded > 0 && (
                      <LabelledMoney
                        label={t('Transfer needed')}
                        amount={account.transferNeeded}
                        isBad
                      />
                    )}
                  </View>
                  {account.firstShortfallDate !== null && (
                    <Text style={{ color: theme.errorText }}>
                      {t('Falls short on {{date}}', {
                        date: labels.day(account.firstShortfallDate),
                      })}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      <AccountChoice data={data} isLeftOut />
    </>
  );
}
