import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { monthOf } from '#period-budget';
import type { PeriodBudgetView } from '#period-budget';

import { Figure } from './Figure';
import { Money } from './Money';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodBudgetFiguresProps = {
  view: PeriodBudgetView;
  labels: PeriodBudgetLabels;
  isNarrow?: boolean;
};

// The three figures of the header, and overspending on its own line.
export function PeriodBudgetFigures({
  view,
  labels,
  isNarrow = false,
}: PeriodBudgetFiguresProps) {
  const { t } = useTranslation();
  const { figures, asOf } = view;
  const date = labels.day(asOf);

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: isNarrow ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: isNarrow ? 14 : 36,
        }}
      >
        <Figure label={t('Cash in selected accounts')} amount={figures.cash}>
          {figures.inAccounts !== null && figures.owed !== null ? (
            <>
              <Trans>In accounts</Trans> <Money amount={figures.inAccounts} />
              {' · '}
              <Trans>Owed</Trans> <Money amount={figures.owed} />
            </>
          ) : (
            <Trans>The cash in the accounts could not be calculated.</Trans>
          )}
        </Figure>
        <Figure
          label={t('Spent in {{month}}', {
            month: labels.month(monthOf(asOf)),
          })}
          amount={figures.spentThisMonth}
        >
          {t('By transaction date, up to {{date}}', { date })}
        </Figure>
        <Figure
          label={t('Remaining in active periods')}
          amount={figures.remainingInActivePeriods}
        >
          {t('Allowance left in the periods that contain {{date}}: {{count}}', {
            date,
            count: figures.activePeriodCount,
          })}
        </Figure>
      </View>
      <View
        role="group"
        aria-label={t('Overspending in active periods')}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          color:
            figures.overspending > 0 ? theme.errorText : theme.pageTextSubdued,
        }}
      >
        <Text>
          <Trans>Overspending in active periods</Trans>
        </Text>
        <Money amount={figures.overspending} style={{ fontWeight: 600 }} />
        {figures.overspentPeriodCount > 0 && (
          <Text>
            {t('Overspent periods: {{count}}', {
              count: figures.overspentPeriodCount,
            })}
          </Text>
        )}
      </View>
    </View>
  );
}
