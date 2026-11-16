import * as monthUtils from '@actual-app/core/shared/months';

// How far ahead the cash forecast of the accounts looks.
export const CASH_HORIZONS = [
  'this-month',
  'next-month',
  '90-days',
  '12-months',
] as const;

export type CashHorizon = (typeof CASH_HORIZONS)[number];

export const DEFAULT_CASH_HORIZON: CashHorizon = 'next-month';

// The horizon a stored choice stands for; the default when nothing usable is
// stored.
export function toCashHorizon(value: string | undefined): CashHorizon {
  return (
    CASH_HORIZONS.find(horizon => horizon === value) ?? DEFAULT_CASH_HORIZON
  );
}

// The last day of the forecast.
export function cashHorizonEnd(asOf: string, horizon: CashHorizon): string {
  if (horizon === 'this-month') {
    return monthUtils.lastDayOfMonth(asOf);
  }
  if (horizon === 'next-month') {
    return monthUtils.lastDayOfMonth(monthUtils.addMonths(asOf, 1));
  }
  if (horizon === '90-days') {
    return monthUtils.addDays(asOf, 90);
  }
  // The same day a year later, or the last day of that month when it is
  // shorter
  const month = monthUtils.addMonths(asOf, 12);
  const lastDay = monthUtils.lastDayOfMonth(month);
  const sameDay = `${month}-${asOf.slice(8)}`;
  return sameDay > lastDay ? lastDay : sameDay;
}
