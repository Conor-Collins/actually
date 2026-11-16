import { useSyncedPref } from '#hooks/useSyncedPref';
import {
  buildCashForecast,
  cashHorizonEnd,
  toCashHorizon,
} from '#period-budget';
import type { CashForecast, CashHorizon } from '#period-budget';

import type { PeriodBudgetData } from './usePeriodBudgetData';

type CashForecastState = {
  horizon: CashHorizon;
  onHorizonChange: (horizon: CashHorizon) => void;
  // Null when the cash in the accounts could not be calculated
  forecast: CashForecast | null;
};

// The cash forecast of the selected accounts as far as the user chose to
// look. The choice is kept with the budget file.
export function useCashForecast(data: PeriodBudgetData): CashForecastState {
  const [stored, setStored] = useSyncedPref('period-budget-horizon');
  const horizon = toCashHorizon(stored);
  const { calculation } = data;

  return {
    horizon,
    onHorizonChange: setStored,
    forecast:
      calculation === null
        ? null
        : buildCashForecast({
            calculation,
            horizonEnd: cashHorizonEnd(calculation.asOf, horizon),
          }),
  };
}
