import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { axisMonths, axisPosition, endAfter, isOnAxis } from '#period-budget';
import type { AccountForecast, Axis, CashForecast } from '#period-budget';

import { LineRise, LineRun } from './GraphLine';
import { percent, TRACK_HEIGHT } from './layout';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type AccountTrackProps = {
  account: AccountForecast;
  forecast: CashForecast;
  axis: Axis;
  name: string;
  labels: PeriodBudgetLabels;
};

// Room above the highest and under the lowest balance
const MARGIN = 6;

function clamp(position: number): number {
  return Math.min(1, Math.max(0, position));
}

// An account's part of the timeline: its closing balance from the as-of day
// to the last day of the forecast as a line that steps on each day with a
// payment, income or a transfer, the days it is short marked, and the level
// of zero.
export function AccountTrack({
  account,
  forecast,
  axis,
  name,
  labels,
}: AccountTrackProps) {
  const { t } = useTranslation();
  const { asOf, horizonEnd } = forecast;
  const dayWidth = axisPosition(axis, monthUtils.addDays(axis.start, 1));

  // The middle of a day
  function at(day: string) {
    return axisPosition(axis, day) + dayWidth / 2;
  }

  const balances = account.points.map(point => point.balance);
  const low = Math.min(0, ...balances);
  const high = Math.max(0, ...balances);

  function y(balance: number) {
    return high === low ? 0.5 : (high - balance) / (high - low);
  }

  const from = clamp(at(asOf));
  // The end of the forecast's last day
  const to = clamp(axisPosition(axis, endAfter(horizonEnd)));
  const color = account.isForecast ? theme.reportsBlue : theme.pageTextSubdued;

  const summary = [
    t('Balance of {{account}} from {{start}} to {{end}}', {
      account: name,
      start: labels.day(asOf),
      end: labels.day(horizonEnd),
    }),
    t('lowest {{amount}}', {
      amount: labels.spokenMoney(account.minimumDailyClosingBalance),
    }),
    t('at the end {{amount}}', {
      amount: labels.spokenMoney(account.projectedEndingBalance),
    }),
  ];
  if (account.firstShortfallDate !== null) {
    summary.push(
      t('short from {{date}}, a transfer of {{amount}} covers it', {
        date: labels.day(account.firstShortfallDate),
        amount: labels.spokenMoney(account.transferNeeded),
      }),
    );
  } else if (account.isForecast) {
    summary.push(t('not short'));
  } else {
    summary.push(t('shortfalls are not forecast'));
  }

  return (
    <View
      role="img"
      aria-label={summary.join(', ')}
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

      {account.shortfalls.map(span => {
        const start = clamp(at(span.start));
        const end =
          span.lastDay === horizonEnd ? to : clamp(at(endAfter(span.lastDay)));
        return (
          end > start && (
            <View
              key={span.start}
              aria-hidden
              data-testid="shortfall"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                backgroundColor: theme.errorBackground,
              }}
              nativeStyle={{
                left: percent(start),
                width: percent(end - start),
              }}
            />
          )
        );
      })}

      {to > from && (
        <View
          style={{
            position: 'absolute',
            top: MARGIN,
            bottom: MARGIN,
            left: 0,
            right: 0,
          }}
        >
          <LineRun
            from={from}
            to={to}
            y={y(0)}
            color={theme.pageTextSubdued}
            thickness={1}
            testId="balance-zero"
          />
          {account.points.map((point, index) => {
            const next = account.points[index + 1];
            const start = clamp(at(point.date));
            const end = next ? clamp(at(next.date)) : to;
            const previous = account.points[index - 1];
            return (
              <View key={point.date} aria-hidden>
                {previous && isOnAxis(axis, point.date) && (
                  <LineRise
                    x={start}
                    fromY={y(previous.balance)}
                    toY={y(point.balance)}
                    color={color}
                    testId="balance-step"
                  />
                )}
                {end > start && (
                  <LineRun
                    from={start}
                    to={end}
                    y={y(point.balance)}
                    color={color}
                    testId="balance-line"
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      {isOnAxis(axis, horizonEnd) && (
        <View
          aria-hidden
          data-testid="forecast-end"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: theme.pageTextSubdued,
          }}
          nativeStyle={{ left: percent(to) }}
        />
      )}
      {isOnAxis(axis, asOf) && (
        <View
          aria-hidden
          data-testid="forecast-as-of"
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
