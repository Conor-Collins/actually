import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { isShownCharge, periodProgress, spentFraction } from '#period-budget';

import type { BudgetPeriod } from './BudgetPeriods';
import { percent } from './layout';
import { Money } from './Money';
import { TimelineMarkers } from './TimelineMarkers';
import { useMarkLabels } from './useMarkLabels';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import { usePeriodBudgetLabels } from './usePeriodBudgetLabels';

export type BudgetPeriodSnapshotProps = {
  entry: BudgetPeriod;
  data: PeriodBudgetData;
  asOf: string;
  isOpen: boolean;
  onPress: () => void;
  isMobile?: boolean;
};

export function BudgetPeriodSnapshot({
  entry,
  data,
  asOf,
  isOpen,
  onPress,
  isMobile = false,
}: BudgetPeriodSnapshotProps) {
  const { t } = useTranslation();
  const amountsId = useId();
  const labels = usePeriodBudgetLabels();
  const { paymentLabel, chargeLabel } = useMarkLabels(data, labels);
  const { row, view, cadenceMonths } = entry;
  const { period } = view;
  const color = view.overspending > 0 ? theme.errorText : theme.reportsBlue;
  const markers = [
    ...view.payments.map(payment => ({
      id: `payment-${payment.id}`,
      position: periodProgress(period, payment.date),
      label: paymentLabel(payment, view),
    })),
    ...view.charges.filter(isShownCharge).map(charge => ({
      id: `charge-${charge.id}`,
      position: periodProgress(period, charge.dueDate),
      label: chargeLabel(charge, true),
      isHollow: true,
      color: charge.isOverdue ? theme.errorText : undefined,
    })),
  ];

  let cadence = t('Multi-month');
  if (cadenceMonths === 12) {
    cadence = t('Yearly');
  } else if (cadenceMonths === 3) {
    cadence = t('Quarterly');
  } else if (cadenceMonths !== null) {
    cadence = t('{{count}}-month period', { count: cadenceMonths });
  }

  const figures = [
    { label: t('Budgeted'), amount: view.allowance },
    { label: t('Spent'), amount: view.spent },
    { label: t('Balance'), amount: view.remaining },
  ];
  return (
    <Button
      variant="bare"
      bounce={false}
      aria-expanded={isOpen}
      aria-label={t('Period details for {{category}}', {
        category: row.category.name,
      })}
      aria-describedby={amountsId}
      onPress={onPress}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        flex: 1,
        width: '100%',
        minWidth: 0,
        padding: '4px 0 6px',
        gap: 3,
        color: theme.pageTextDark,
        backgroundColor: theme.tableRowHeaderBackground,
        borderTop: `1px solid ${theme.tableBorder}`,
        borderRadius: 0,
      }}
    >
      <Text id={amountsId} style={styles.visuallyHidden}>
        {figures
          .map(({ label, amount }) => label + ' ' + labels.spokenMoney(amount))
          .join(', ')}
      </Text>
      <Text
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          textAlign: 'right',
          paddingInlineEnd: isMobile ? undefined : styles.monthRightPadding,
        }}
      >
        {figures.map(({ label, amount }, index) => (
          <Text
            key={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingInline: 5,
              overflowWrap: 'anywhere',
              color: index === 2 && amount < 0 ? theme.errorText : undefined,
            }}
          >
            <Text
              style={
                isMobile
                  ? { fontSize: 11, color: theme.pageTextSubdued }
                  : styles.visuallyHidden
              }
            >
              {label}
            </Text>
            <Money amount={amount} />
          </Text>
        ))}
      </Text>
      <Text
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingInline: 8,
        }}
      >
        <Text
          title={labels.period(period)}
          style={{
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 12,
            padding: '1px 6px',
            fontSize: 11,
            maxWidth: '50%',
            overflowWrap: 'anywhere',
          }}
        >
          {cadence}
        </Text>
        <Text
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minWidth: 18,
            height: 18,
            position: 'relative',
            justifyContent: 'center',
          }}
        >
          <Text
            aria-hidden
            style={{
              display: 'block',
              height: 6,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: theme.tableBackground,
              border: `1px solid ${color}`,
            }}
          >
            <Text
              data-testid="period-progress"
              style={{
                display: 'block',
                height: '100%',
                width: percent(spentFraction(view.allowance, view.spent)),
                backgroundColor: color,
              }}
            />
          </Text>
          <Text
            style={{
              position: 'absolute',
              inset: '0 9px',
              pointerEvents: 'none',
            }}
          >
            <Text
              role="img"
              aria-label={t('As of {{date}}', { date: labels.day(asOf) })}
              title={t('As of {{date}}', { date: labels.day(asOf) })}
              data-testid="period-as-of"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: percent(periodProgress(period, asOf)),
                width: 2,
                backgroundColor: theme.pageTextPositive,
              }}
            />
          </Text>
          <TimelineMarkers markers={markers} center={9} />
        </Text>
      </Text>
    </Button>
  );
}
