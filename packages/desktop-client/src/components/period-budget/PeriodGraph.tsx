import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { buildPeriodGraph, graphHeight } from '#period-budget';
import type { CategoryRowView, PeriodView } from '#period-budget';

import { LineRise, LineRun } from './GraphLine';
import { GraphMark } from './GraphMark';
import { lineStyle, percent } from './layout';
import { Money } from './Money';
import { useMarkLabels } from './useMarkLabels';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type PeriodGraphProps = {
  row: CategoryRowView;
  view: PeriodView;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
};

type Chosen = { kind: 'payment' | 'charge'; id: string };

const HEIGHT = 170;
// Room above the highest and under the lowest amount, for the marks
const MARGIN = 14;

// A period's graph: the allowance as a level line over the period's days,
// what is spent as a line that steps at each payment's real date, and the
// scheduled charges that are still expected as hollow marks on a dashed line
// from the as-of day. A payment dated outside the period is at its real date,
// outside the period's band, joined to it by a thin line.
export function PeriodGraph({
  row,
  view,
  asOf,
  data,
  labels,
}: PeriodGraphProps) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const { paymentLabel, chargeLabel } = useMarkLabels(data, labels);
  const graph = buildPeriodGraph(view, asOf);
  const periodName = labels.period(view.period);
  const color = view.overspending > 0 ? theme.reportsRed : theme.reportsBlue;
  const hasEarly = view.payments.some(payment => payment.timing === 'early');
  const hasLate = view.payments.some(payment => payment.timing === 'late');
  const asOfDate = labels.day(asOf);

  function y(amount: number) {
    return graphHeight(graph, amount);
  }

  function choose(kind: Chosen['kind'], id: string) {
    setChosen(chosen?.kind === kind && chosen.id === id ? null : { kind, id });
  }

  const chosenPayment =
    chosen?.kind === 'payment'
      ? graph.payments.find(entry => entry.payment.id === chosen.id)
      : undefined;
  const chosenCharge =
    chosen?.kind === 'charge'
      ? graph.charges.find(entry => entry.charge.id === chosen.id)
      : undefined;

  return (
    <View
      role="group"
      aria-label={t('Graph of {{category}}, {{period}}', {
        category: row.category.name,
        period: periodName,
      })}
      style={{ gap: 6 }}
    >
      <View
        style={{
          position: 'relative',
          height: HEIGHT,
          borderBottom: `1px solid ${theme.tableBorder}`,
        }}
      >
        <View
          aria-hidden
          data-testid="graph-period"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            backgroundColor: theme.tableRowHeaderBackground,
          }}
          nativeStyle={{
            left: percent(graph.periodFrom),
            width: percent(graph.periodTo - graph.periodFrom),
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: MARGIN,
            bottom: MARGIN,
            left: 0,
            right: 0,
          }}
        >
          {graph.low < 0 && (
            <LineRun
              from={0}
              to={1}
              y={y(0)}
              color={theme.tableBorder}
              thickness={1}
              testId="graph-zero"
            />
          )}
          <LineRun
            from={graph.periodFrom}
            to={graph.periodTo}
            y={y(graph.allowance)}
            color={theme.noticeText}
            testId="graph-allowance"
          />
          {graph.runs.map((run, index) => {
            // Outside the period's days: the thin line that joins a payment
            // to its period
            const isLink = run.zone !== 'inside';
            return (
              <LineRun
                // The runs of a graph do not change places
                // oxlint-disable-next-line react/no-array-index-key
                key={index}
                from={run.from}
                to={run.to}
                y={y(run.level)}
                color={isLink ? theme.pageTextSubdued : color}
                thickness={isLink ? 1 : 2}
                isDashed={run.kind === 'expected'}
                testId={isLink ? `graph-${run.zone}-link` : `graph-${run.kind}`}
              />
            );
          })}
          {graph.rises.map((rise, index) => (
            <LineRise
              // oxlint-disable-next-line react/no-array-index-key
              key={index}
              x={rise.x}
              fromY={y(rise.from)}
              toY={y(rise.to)}
              color={color}
              isDashed={rise.kind === 'expected'}
              testId={`graph-${rise.kind}-step`}
            />
          ))}
          {graph.payments.map(({ payment, x, level }) => (
            <GraphMark
              key={payment.id}
              x={x}
              y={y(level)}
              label={paymentLabel(payment, view)}
              isSelected={chosenPayment?.payment.id === payment.id}
              onPress={() => choose('payment', payment.id)}
            />
          ))}
          {graph.charges.map(({ charge, x, level }) => (
            <GraphMark
              key={charge.id}
              x={x}
              y={y(level)}
              label={chargeLabel(charge, true)}
              color={charge.isOverdue ? theme.errorText : color}
              isHollow
              isSelected={chosenCharge?.charge.id === charge.id}
              onPress={() => choose('charge', charge.id)}
            />
          ))}
        </View>
        {graph.asOfX !== null && (
          <View
            aria-hidden
            data-testid="graph-as-of"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 2,
              marginLeft: -1,
              backgroundColor: theme.pageTextPositive,
              pointerEvents: 'none',
            }}
            nativeStyle={{ left: percent(graph.asOfX) }}
          />
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 12,
          color: theme.pageTextSubdued,
        }}
      >
        <Text>{labels.day(graph.start)}</Text>
        <Text style={{ color: theme.pageTextPositive, fontWeight: 600 }}>
          {graph.asOfPlace === 'shown' &&
            t('As of {{date}}', { date: asOfDate })}
          {graph.asOfPlace === 'before' &&
            t('As of {{date}}, before the days shown', { date: asOfDate })}
          {graph.asOfPlace === 'after' &&
            t('As of {{date}}, after the days shown', { date: asOfDate })}
        </Text>
        <Text>{labels.day(graph.lastDay)}</Text>
      </View>

      {(hasEarly || hasLate) && (
        <Text style={{ color: theme.warningText }}>
          {hasEarly &&
            t(
              'A payment left of the band is early: it is dated before {{period}} and counts in it.',
              { period: periodName },
            )}
          {hasEarly && hasLate && ' '}
          {hasLate &&
            t(
              'A payment right of the band is late: it is dated after {{period}} and counts in it.',
              { period: periodName },
            )}
        </Text>
      )}

      <View
        role="group"
        aria-label={t('Chosen in the graph')}
        aria-live="polite"
        style={{ ...lineStyle, minHeight: 20 }}
      >
        {chosenPayment && (
          <>
            <Text>{labels.day(chosenPayment.payment.date)}</Text>
            {chosenPayment.payment.timing === 'early' && (
              <Text style={{ color: theme.warningText, fontWeight: 600 }}>
                <Trans>early</Trans>
              </Text>
            )}
            {chosenPayment.payment.timing === 'late' && (
              <Text style={{ color: theme.warningText, fontWeight: 600 }}>
                <Trans>late</Trans>
              </Text>
            )}
            <Text>{data.payeeName(chosenPayment.payment.payee)}</Text>
            <Text style={{ color: theme.pageTextSubdued }}>
              {data.accountName(chosenPayment.payment.account)}
            </Text>
            <Money amount={chosenPayment.payment.amount} />
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>Spent with this payment</Trans>
            </Text>
            <Money amount={chosenPayment.level} />
          </>
        )}
        {chosenCharge && (
          <>
            <Text>
              {t('Due on {{date}}', {
                date: labels.day(chosenCharge.charge.dueDate),
              })}
            </Text>
            {chosenCharge.charge.isOverdue && (
              <Text style={{ color: theme.errorText, fontWeight: 600 }}>
                <Trans>overdue</Trans>
              </Text>
            )}
            <Text>{data.scheduleName(chosenCharge.charge.scheduleId)}</Text>
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>still expected</Trans>
            </Text>
            <Money amount={chosenCharge.amount} />
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>Spent and expected with this charge</Trans>
            </Text>
            <Money amount={chosenCharge.level} />
          </>
        )}
        {!chosenPayment && !chosenCharge && (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>
              Choose a mark to read its date and amount. Solid marks are
              payments, hollow marks are scheduled charges that are still
              expected.
            </Trans>
          </Text>
        )}
      </View>

      <View
        aria-hidden
        style={{
          ...lineStyle,
          gap: 14,
          fontSize: 12,
          color: theme.pageTextSubdued,
        }}
      >
        <LegendLine color={theme.noticeText} label={t('Allowance')} />
        <LegendLine color={color} label={t('Spent')} />
        <LegendLine color={color} label={t('Still expected')} isDashed />
      </View>
    </View>
  );
}

type LegendLineProps = {
  color: string;
  label: string;
  isDashed?: boolean;
};

function LegendLine({ color, label, isDashed = false }: LegendLineProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{ width: 18, height: 0 }}
        nativeStyle={{
          borderTop: `2px ${isDashed ? 'dashed' : 'solid'} ${color}`,
        }}
      />
      <Text>{label}</Text>
    </View>
  );
}
