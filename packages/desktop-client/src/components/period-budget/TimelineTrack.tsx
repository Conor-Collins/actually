import { Fragment } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import {
  axisMonths,
  axisPosition,
  axisSpan,
  isOnAxis,
  isShownCharge,
} from '#period-budget';
import type {
  Axis,
  CategoryRowView,
  ChargeView,
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
import { TimelineMarkers } from './TimelineMarkers';
import type { TimelineMarker } from './TimelineMarkers';
import { useMarkLabels } from './useMarkLabels';
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
  const { paymentLabel, chargeLabel } = useMarkLabels(data, labels);
  const dayWidth = axisPosition(axis, monthUtils.addDays(axis.start, 1));

  // The middle of a day
  function at(day: string) {
    return axisPosition(axis, day) + dayWidth / 2;
  }

  function isOnTrack(charge: ChargeView) {
    return isOnAxis(axis, charge.dueDate) && isShownCharge(charge);
  }

  const barMarkers: TimelineMarker[] = [];
  const laneMarkers: TimelineMarker[] = [];
  const offsetLinks: {
    id: string;
    position: number;
    edge: number;
    edgeDay: string;
  }[] = [];
  for (const view of row.periods) {
    for (const payment of view.payments.filter(payment =>
      isOnAxis(axis, payment.date),
    )) {
      const position = at(payment.date);
      const marker = {
        id: `payment-${payment.id}`,
        position,
        label: paymentLabel(payment, view),
        onClick: () => onSelectPeriod(view),
      };
      if (payment.timing === 'inside') {
        barMarkers.push(marker);
      } else {
        const edgeDay =
          payment.timing === 'early'
            ? view.period.start
            : monthUtils.subDays(view.period.end, 1);
        offsetLinks.push({
          id: payment.id,
          position,
          edge: clamp(at(edgeDay)),
          edgeDay,
        });
        laneMarkers.push(marker);
      }
    }
    for (const charge of view.charges.filter(isOnTrack)) {
      barMarkers.push({
        id: `charge-${charge.id}`,
        position: at(charge.dueDate),
        label: chargeLabel(charge, true),
        color: charge.isOverdue ? theme.errorText : undefined,
        isHollow: true,
        onClick: () => onSelectPeriod(view),
      });
    }
  }
  for (const payment of row.unassigned.filter(payment =>
    isOnAxis(axis, payment.date),
  )) {
    laneMarkers.push({
      id: `payment-${payment.id}`,
      position: at(payment.date),
      label: paymentLabel(payment, null),
      color: theme.warningText,
    });
  }
  for (const charge of row.chargesWithoutPeriod.filter(isOnTrack)) {
    laneMarkers.push({
      id: `charge-${charge.id}`,
      position: at(charge.dueDate),
      label: chargeLabel(charge, false),
      color: theme.warningText,
      isHollow: true,
    });
  }

  return (
    <View
      style={{
        position: 'relative',
        height: TRACK_HEIGHT,
        overflow: 'visible',
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

      {offsetLinks.map(({ id, position, edge, edgeDay }) => (
        <Fragment key={id}>
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
        </Fragment>
      ))}
      <TimelineMarkers markers={barMarkers} center={BAR_CENTER} inset={0} />
      <TimelineMarkers markers={laneMarkers} center={LANE_CENTER} inset={0} />

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
