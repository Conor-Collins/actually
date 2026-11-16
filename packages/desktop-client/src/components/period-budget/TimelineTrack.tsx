import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  axisMonths,
  axisPosition,
  axisSpan,
  isOnAxis,
  outstandingOf,
} from '#period-budget';
import type {
  Axis,
  CategoryRowView,
  ChargeView,
  PaymentView,
  PeriodView,
} from '#period-budget';

import {
  BAR_HEIGHT,
  BAR_TOP,
  LANE_CENTER,
  percent,
  TRACK_HEIGHT,
} from './layout';
import { PeriodBar } from './PeriodBar';
import { TimelineDot } from './TimelineDot';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type TimelineTrackProps = {
  row: CategoryRowView;
  axis: Axis;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  selectedPeriodId: string | null;
  onSelectPeriod: (view: PeriodView) => void;
};

const BAR_CENTER = BAR_TOP + BAR_HEIGHT / 2;
const BAR_BOTTOM = BAR_TOP + BAR_HEIGHT;

function clamp(position: number): number {
  return Math.min(1, Math.max(0, position));
}

// A category's part of the timeline: its periods as bars at their true
// dates, payments as solid dots at their bank dates, expected charges as
// hollow dots at their due dates, and the as-of day as a line.
export function TimelineTrack({
  row,
  axis,
  asOf,
  data,
  labels,
  selectedPeriodId,
  onSelectPeriod,
}: TimelineTrackProps) {
  const { t } = useTranslation();
  const dayWidth = axisPosition(axis, monthUtils.addDays(axis.start, 1));

  // The middle of a day
  function at(day: string) {
    return axisPosition(axis, day) + dayWidth / 2;
  }

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

  function isShownCharge(charge: ChargeView) {
    return (
      isOnAxis(axis, charge.dueDate) &&
      (charge.status === 'expected' || outstandingOf(charge) > 0)
    );
  }

  return (
    <View
      style={{
        position: 'relative',
        height: TRACK_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {axisMonths(axis)
        .slice(1)
        .map(month => (
          <View
            key={month}
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 1,
              backgroundColor: theme.tableBorder,
            }}
            nativeStyle={{ left: percent(axisPosition(axis, `${month}-01`)) }}
          />
        ))}

      {row.periods.map(view => {
        const span = axisSpan(axis, view.period);
        return (
          span && (
            <PeriodBar
              key={view.period.id}
              view={view}
              from={span.from}
              to={span.to}
              categoryName={row.category.name}
              labels={labels}
              isSelected={view.period.id === selectedPeriodId}
              onPress={() => onSelectPeriod(view)}
            />
          )
        );
      })}

      {row.periods.flatMap(view =>
        view.payments
          .filter(payment => isOnAxis(axis, payment.date))
          .map(payment => {
            const position = at(payment.date);
            const label = paymentLabel(payment, view);
            if (payment.timing === 'inside') {
              return (
                <TimelineDot
                  key={payment.id}
                  position={position}
                  center={BAR_CENTER}
                  label={label}
                />
              );
            }
            // Dated outside its period: at its real date, under the bars,
            // joined to its period by a line
            const edgeDay =
              payment.timing === 'early'
                ? view.period.start
                : monthUtils.subDays(view.period.end, 1);
            const edge = clamp(at(edgeDay));
            return (
              <Fragment key={payment.id}>
                <View
                  aria-hidden
                  data-testid="payment-link"
                  style={{
                    position: 'absolute',
                    top: LANE_CENTER,
                    height: 1,
                    backgroundColor: theme.pageTextSubdued,
                  }}
                  nativeStyle={{
                    left: percent(Math.min(position, edge)),
                    width: percent(Math.abs(position - edge)),
                  }}
                />
                {isOnAxis(axis, edgeDay) && (
                  <View
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: BAR_BOTTOM,
                      height: LANE_CENTER - BAR_BOTTOM,
                      width: 1,
                      backgroundColor: theme.pageTextSubdued,
                    }}
                    nativeStyle={{ left: percent(edge) }}
                  />
                )}
                <TimelineDot
                  position={position}
                  center={LANE_CENTER}
                  label={label}
                />
              </Fragment>
            );
          }),
      )}

      {row.unassigned
        .filter(payment => isOnAxis(axis, payment.date))
        .map(payment => (
          <TimelineDot
            key={payment.id}
            position={at(payment.date)}
            center={LANE_CENTER}
            label={paymentLabel(payment, null)}
            color={theme.warningText}
          />
        ))}

      {row.periods.flatMap(view =>
        view.charges
          .filter(isShownCharge)
          .map(charge => (
            <TimelineDot
              key={charge.id}
              position={at(charge.dueDate)}
              center={BAR_CENTER}
              label={chargeLabel(charge, true)}
              color={charge.isOverdue ? theme.errorText : undefined}
              isHollow
            />
          )),
      )}

      {row.chargesWithoutPeriod.filter(isShownCharge).map(charge => (
        <TimelineDot
          key={charge.id}
          position={at(charge.dueDate)}
          center={LANE_CENTER}
          label={chargeLabel(charge, false)}
          color={theme.warningText}
          isHollow
        />
      ))}

      {isOnAxis(axis, asOf) && (
        <View
          aria-hidden
          data-testid="as-of-line"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: theme.pageTextPositive,
            pointerEvents: 'none',
          }}
          nativeStyle={{ left: percent(at(asOf)) }}
        />
      )}
    </View>
  );
}
