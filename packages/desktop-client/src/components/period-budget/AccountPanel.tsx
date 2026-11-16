import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { usePeriodBudgetMutation } from '#period-budget';
import type {
  AccountForecast,
  CashForecast,
  CashMovementView,
} from '#period-budget';

import { LabelledMoney } from './LabelledMoney';
import { lineStyle } from './layout';
import { Money } from './Money';
import { PanelFrame } from './PanelFrame';
import { PanelSection } from './PanelSection';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AccountPanelProps = {
  account: AccountForecast;
  forecast: CashForecast;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  onClose: () => void;
};

// An account's opened row: its balances in the forecast, whether and when
// it falls short and the transfer that covers that, and the scheduled
// payments, income and transfers the forecast counts.
export function AccountPanel({
  account,
  forecast,
  data,
  labels,
  onClose,
}: AccountPanelProps) {
  const { t } = useTranslation();
  const leavingOut = usePeriodBudgetMutation(onClose);
  const horizonEnd = labels.day(forecast.horizonEnd);

  return (
    <PanelFrame title={data.accountName(account.accountId)} onClose={onClose}>
      <View style={{ ...lineStyle, alignItems: 'flex-start', gap: 24 }}>
        <LabelledMoney
          label={t('Balance on {{date}}', { date: labels.day(forecast.asOf) })}
          amount={account.currentBalance}
          isBad={account.currentBalance < 0}
        />
        <LabelledMoney
          label={t('Lowest balance')}
          amount={account.minimumDailyClosingBalance}
          isBad={account.minimumDailyClosingBalance < 0}
        />
        <LabelledMoney
          label={t('Balance on {{date}}', { date: horizonEnd })}
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
        <Text role="alert" style={{ color: theme.errorText }}>
          {t(
            'This account falls short on {{date}}. The transfer needed is the smallest amount that keeps it at zero or above until {{end}}.',
            {
              date: labels.day(account.firstShortfallDate),
              end: horizonEnd,
            },
          )}
        </Text>
      )}
      {account.firstShortfallDate === null && account.isForecast && (
        <Text style={{ color: theme.pageTextSubdued }}>
          {t('This account does not fall short before {{end}}.', {
            end: horizonEnd,
          })}
        </Text>
      )}
      {!account.isForecast && (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>
            Shortfalls are forecast for accounts with a balance above zero on
            the as-of day. This account has none, so it counts as owed.
          </Trans>
        </Text>
      )}

      <View style={lineStyle}>
        <Button
          isDisabled={leavingOut.isPending}
          onPress={() =>
            leavingOut.mutate([
              {
                name: 'period-budget/exclude-account',
                args: { accountId: account.accountId },
              },
            ])
          }
        >
          <Trans>Leave this account out</Trans>
        </Button>
      </View>

      <PanelSection title={t('Upcoming payments')}>
        <Movements
          movements={account.payments}
          empty={t('No scheduled payment before {{end}}.', { end: horizonEnd })}
          data={data}
          labels={labels}
        />
      </PanelSection>
      <PanelSection title={t('Expected income')}>
        <Movements
          movements={account.income}
          empty={t('No scheduled income before {{end}}.', { end: horizonEnd })}
          data={data}
          labels={labels}
        />
      </PanelSection>
      <PanelSection title={t('Transfers')}>
        <Movements
          movements={account.transfers}
          empty={t('No scheduled transfer before {{end}}.', {
            end: horizonEnd,
          })}
          data={data}
          labels={labels}
        />
      </PanelSection>
    </PanelFrame>
  );
}

type MovementsProps = {
  movements: CashMovementView[];
  empty: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

function Movements({ movements, empty, data, labels }: MovementsProps) {
  if (movements.length === 0) {
    return <Text style={{ color: theme.pageTextSubdued }}>{empty}</Text>;
  }

  return (
    <View role="list" style={{ gap: 6 }}>
      {movements.map(movement => (
        <View key={movement.id} role="listitem" style={lineStyle}>
          <Text>{labels.day(movement.dueDate)}</Text>
          {movement.isOverdue && (
            <Text style={{ color: theme.errorText, fontWeight: 600 }}>
              <Trans>overdue</Trans>
            </Text>
          )}
          <Text style={{ flex: '1 1 120px' }}>
            {data.scheduleName(movement.scheduleId)}
          </Text>
          {movement.isPosted && (
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>entered already</Trans>
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {/* The schedule's amount is an estimate */}
            {movement.isApproximate && <Text>≈</Text>}
            <Money amount={movement.amount} />
          </View>
        </View>
      ))}
    </View>
  );
}
