import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  axisAround,
  axisMonths,
  axisPosition,
  monthOf,
  moveAxis,
} from '#period-budget';
import type { Axis, PeriodBudgetView } from '#period-budget';

import { CategoryRow } from './CategoryRow';
import { AMOUNT_WIDTH, lineStyle, NAME_WIDTH, percent } from './layout';
import type { Selection } from './selection';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type TimelineProps = {
  view: PeriodBudgetView;
  axis: Axis;
  onAxisChange: (axis: Axis) => void;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
};

const ZOOMS = [3, 6, 12];

// The categories by group, each with the figures of its active period and
// its periods on an axis of months that can be moved and zoomed.
export function Timeline({
  view,
  axis,
  onAxisChange,
  data,
  labels,
  selection,
  onSelect,
}: TimelineProps) {
  const { t } = useTranslation();
  const months = axisMonths(axis);
  const isYear = months.length >= 12;
  // A year moves by a year, a shorter axis by a month
  const step = isYear ? 12 : 1;
  const axisName = isYear
    ? axis.start.slice(0, 4)
    : t('{{start}} to {{end}}', {
        start: labels.month(months[0]),
        end: labels.month(months[months.length - 1]),
      });
  const amountHeaders = [
    t('Allowance'),
    t('Spent'),
    t('Remaining'),
    t('Expected remaining'),
  ];

  return (
    <View style={{ gap: 8 }}>
      <View style={lineStyle}>
        <Button
          variant="bare"
          aria-label={t('Show earlier months')}
          onPress={() => onAxisChange(moveAxis(axis, -step))}
        >
          <SvgCheveronLeft width={16} height={16} />
        </Button>
        <Text style={{ fontWeight: 600 }}>{axisName}</Text>
        <Button
          variant="bare"
          aria-label={t('Show later months')}
          onPress={() => onAxisChange(moveAxis(axis, step))}
        >
          <SvgCheveronRight width={16} height={16} />
        </Button>
        {ZOOMS.map(count => (
          <Button
            key={count}
            aria-pressed={months.length === count}
            style={{ fontWeight: months.length === count ? 600 : 400 }}
            onPress={() => onAxisChange(axisAround(monthOf(view.asOf), count))}
          >
            {t('{{count}} months', { count })}
          </Button>
        ))}
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>
            The amounts are those of the period that is active on the as-of day.
            Choose a bar to see its payments and charges.
          </Trans>
        </Text>
      </View>

      <View style={{ overflowX: 'auto' }}>
        <View
          role="table"
          aria-label={t('Periods by category')}
          style={{ minWidth: 900 }}
        >
          <View role="rowgroup">
            <View
              role="row"
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                color: theme.pageTextSubdued,
                fontSize: 12,
                paddingBottom: 4,
              }}
            >
              <View
                role="columnheader"
                style={{ width: NAME_WIDTH, flexShrink: 0, paddingLeft: 5 }}
              >
                <Trans>Category</Trans>
              </View>
              {amountHeaders.map(header => (
                <View
                  key={header}
                  role="columnheader"
                  style={{
                    width: AMOUNT_WIDTH,
                    flexShrink: 0,
                    alignItems: 'flex-end',
                    paddingRight: 10,
                    textAlign: 'right',
                  }}
                >
                  {header}
                </View>
              ))}
              <View
                role="columnheader"
                aria-label={t('Periods from {{start}} to {{end}}', {
                  start: labels.month(months[0]),
                  end: labels.month(months[months.length - 1]),
                })}
                style={{ flex: 1, position: 'relative', height: 16 }}
              >
                {months.map(month => (
                  <View
                    key={month}
                    aria-hidden
                    style={{ position: 'absolute', paddingLeft: 3 }}
                    nativeStyle={{
                      left: percent(axisPosition(axis, `${month}-01`)),
                    }}
                  >
                    {labels.shortMonth(month)}
                  </View>
                ))}
              </View>
            </View>
          </View>
          {view.groups.map(({ group, rows }) => (
            <View key={group.id} role="rowgroup">
              <View
                role="row"
                style={{
                  borderTop: `1px solid ${theme.tableBorder}`,
                  backgroundColor: theme.tableRowHeaderBackground,
                }}
              >
                <View
                  role="rowheader"
                  aria-colspan={6}
                  style={{ padding: '5px', fontWeight: 600 }}
                >
                  {group.name}
                </View>
              </View>
              {rows.map(row => {
                const opened =
                  selection?.categoryId === row.category.id ? selection : null;
                return (
                  <CategoryRow
                    key={row.category.id}
                    row={row}
                    axis={axis}
                    asOf={view.asOf}
                    data={data}
                    labels={labels}
                    isOpen={opened !== null}
                    openPeriod={opened?.period ?? null}
                    onSelect={onSelect}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
