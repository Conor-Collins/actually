import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import type { CashForecast, CashHorizon } from '#period-budget';

import { AccountChoice } from './AccountChoice';
import { CashTotals } from './CashTotals';
import { HorizonControl } from './HorizonControl';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type ForecastSummaryProps = {
  asOf: string;
  horizon: CashHorizon;
  onHorizonChange: (horizon: CashHorizon) => void;
  forecast: CashForecast | null;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

// What is above the accounts of the cash forecast: how far it looks and its
// totals, or why there is none.
export function ForecastSummary({
  asOf,
  horizon,
  onHorizonChange,
  forecast,
  data,
  labels,
}: ForecastSummaryProps) {
  return (
    <>
      <HorizonControl
        asOf={asOf}
        horizon={horizon}
        onHorizonChange={onHorizonChange}
        labels={labels}
      />
      {forecast === null && (
        <>
          <Text style={{ color: theme.errorText }}>
            <Trans>
              There is no forecast: the balance of an account that is counted
              could not be used. Leave that account out to get a forecast of the
              others.
            </Trans>
          </Text>
          <AccountChoice data={data} isLeftOut={false} />
        </>
      )}
      {forecast !== null && forecast.accounts.length === 0 && (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>No account is counted in the forecast.</Trans>
        </Text>
      )}
      {forecast !== null && forecast.accounts.length > 0 && (
        <CashTotals forecast={forecast} labels={labels} />
      )}
    </>
  );
}
