import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { usePrivacyMode } from '#hooks/usePrivacyMode';
import { periodSpan } from '#period-budget';

export type PeriodBudgetLabels = {
  day: (day: string) => string;
  month: (month: string) => string;
  shortMonth: (month: string) => string;
  // "April 2026", "2026", or the first and last day of an irregular period
  period: (period: { start: string; end: string }) => string;
  money: (amount: number) => string;
  // An amount inside a label that is read out: not given in privacy mode,
  // where nothing on the screen can cover it
  spokenMoney: (amount: number) => string;
};

// The words for days, months, periods and amounts, as text for labels.
export function usePeriodBudgetLabels(): PeriodBudgetLabels {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();
  const isPrivate = usePrivacyMode();

  function day(value: string) {
    return monthUtils.format(value, dateFormat, locale);
  }

  function month(value: string) {
    return monthUtils.format(value, 'MMMM yyyy', locale);
  }

  function shortMonth(value: string) {
    return monthUtils.format(value, 'MMM', locale);
  }

  function period(value: { start: string; end: string }) {
    const span = periodSpan(value);
    if (span.kind === 'month') {
      return month(span.month);
    }
    if (span.kind === 'year') {
      return span.year;
    }
    return t('{{start}} to {{end}}', {
      start: day(span.start),
      end: day(span.lastDay),
    });
  }

  function money(amount: number) {
    return format(amount, 'financial');
  }

  function spokenMoney(amount: number) {
    return isPrivate ? t('hidden amount') : money(amount);
  }

  return { day, month, shortMonth, period, money, spokenMoney };
}
