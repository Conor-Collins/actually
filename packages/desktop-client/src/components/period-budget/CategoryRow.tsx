import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { findPeriod } from '#period-budget';
import type {
  Axis,
  CategoryRowView,
  PeriodRef,
  PeriodView,
} from '#period-budget';

import { AmountCell } from './AmountCell';
import { AMOUNT_WIDTH, NAME_WIDTH } from './layout';
import { OpenedRow } from './OpenedRow';
import type { Selection } from './selection';
import { TimelineTrack } from './TimelineTrack';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type CategoryRowProps = {
  row: CategoryRowView;
  axis: Axis;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  isOpen: boolean;
  // The period chosen in the opened row
  openPeriod: PeriodRef | null;
  onSelect: (selection: Selection | null) => void;
};

// A category on the timeline: its name, the figures of its active period,
// and its periods. The opened row is shown in place under it.
export function CategoryRow({
  row,
  axis,
  asOf,
  data,
  labels,
  isOpen,
  openPeriod,
  onSelect,
}: CategoryRowProps) {
  const { category, activePeriod } = row;
  const openView =
    isOpen && openPeriod !== null ? findPeriod(row, openPeriod) : null;
  const isCategoryOpen = isOpen && openView === null;

  function selectPeriod(view: PeriodView) {
    onSelect(
      openView?.period.id === view.period.id
        ? null
        : {
            categoryId: category.id,
            period: { id: view.period.id, start: view.period.start },
          },
    );
  }

  return (
    <>
      <View
        role="row"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderTop: `1px solid ${theme.tableBorder}`,
        }}
      >
        <View role="rowheader" style={{ width: NAME_WIDTH, flexShrink: 0 }}>
          <Button
            variant="bare"
            aria-expanded={isCategoryOpen}
            onPress={() =>
              onSelect(
                isCategoryOpen
                  ? null
                  : { categoryId: category.id, period: null },
              )
            }
            style={{ justifyContent: 'flex-start' }}
          >
            <Text
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {category.name}
            </Text>
          </Button>
        </View>
        {activePeriod ? (
          <>
            <AmountCell amount={activePeriod.allowance} />
            <AmountCell amount={activePeriod.spent} />
            <AmountCell
              amount={activePeriod.remaining}
              isBad={activePeriod.remaining < 0}
            />
            <AmountCell
              amount={activePeriod.expectedRemaining}
              isBad={activePeriod.expectedRemaining < 0}
            />
          </>
        ) : (
          <View
            role="cell"
            aria-colspan={4}
            style={{ width: AMOUNT_WIDTH * 4, flexShrink: 0 }}
          >
            <Text style={{ color: theme.pageTextSubdued }}>
              {row.periods.length === 0 ? (
                <Trans>No periods yet</Trans>
              ) : (
                <Trans>No active period</Trans>
              )}
            </Text>
          </View>
        )}
        <View role="cell" style={{ flex: 1 }}>
          <TimelineTrack
            row={row}
            axis={axis}
            asOf={asOf}
            data={data}
            labels={labels}
            selectedPeriodId={openView?.period.id ?? null}
            onSelectPeriod={selectPeriod}
          />
        </View>
      </View>
      {isOpen && (
        <View role="row">
          <View role="cell" aria-colspan={6} style={{ padding: '4px 0 12px' }}>
            <OpenedRow
              row={row}
              period={openPeriod}
              asOf={asOf}
              data={data}
              labels={labels}
              onSelect={onSelect}
            />
          </View>
        </View>
      )}
    </>
  );
}
