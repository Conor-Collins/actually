import { useTranslation } from 'react-i18next';

import { outstandingOf } from '#period-budget';
import type { ChargeView, PaymentView, PeriodView } from '#period-budget';

import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

// What a payment's mark and a charge's mark say, on the timeline and in a
// period's graph.
export function useMarkLabels(
  data: PeriodBudgetData,
  labels: PeriodBudgetLabels,
) {
  const { t } = useTranslation();

  function paymentLabel(payment: PaymentView, view: PeriodView | null) {
    const values = {
      date: labels.day(payment.date),
      payee: data.payeeName(payment.payee),
      amount: labels.spokenMoney(payment.amount),
      period: view ? labels.period(view.period) : '',
    };
    if (view === null) {
      return t(
        'Payment on {{date}}, in no period: {{payee}}, {{amount}}',
        values,
      );
    }
    if (payment.timing === 'early') {
      return t(
        'Payment on {{date}}, early for {{period}}: {{payee}}, {{amount}}',
        values,
      );
    }
    if (payment.timing === 'late') {
      return t(
        'Payment on {{date}}, late for {{period}}: {{payee}}, {{amount}}',
        values,
      );
    }
    return t('Payment on {{date}}: {{payee}}, {{amount}}', values);
  }

  function chargeLabel(charge: ChargeView, hasPeriod: boolean) {
    const values = {
      date: labels.day(charge.dueDate),
      schedule: data.scheduleName(charge.scheduleId),
      amount: labels.spokenMoney(outstandingOf(charge)),
    };
    if (!hasPeriod) {
      return t(
        'Expected charge on {{date}}, in no period: {{schedule}}, {{amount}}',
        values,
      );
    }
    if (charge.isOverdue) {
      return t('Overdue charge of {{date}}: {{schedule}}, {{amount}}', values);
    }
    return t('Expected charge on {{date}}: {{schedule}}, {{amount}}', values);
  }

  return { paymentLabel, chargeLabel };
}
