import { findPeriod } from '#period-budget';
import type { CategoryRowView, PeriodRef } from '#period-budget';

import { CategoryPanel } from './CategoryPanel';
import { PeriodPanel } from './PeriodPanel';
import type { Selection } from './selection';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type OpenedRowProps = {
  row: CategoryRowView;
  period: PeriodRef | null;
  asOf: string;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  onSelect: (selection: Selection | null) => void;
};

// What an opened row shows: the chosen period, or the category when no
// period is chosen or the chosen one is gone.
export function OpenedRow({
  row,
  period,
  asOf,
  data,
  labels,
  onSelect,
}: OpenedRowProps) {
  const categoryId = row.category.id;
  const view = period === null ? null : findPeriod(row, period);

  if (view === null) {
    return (
      <CategoryPanel
        row={row}
        asOf={asOf}
        data={data}
        labels={labels}
        onClose={() => onSelect(null)}
      />
    );
  }

  return (
    <PeriodPanel
      key={view.period.id}
      row={row}
      view={view}
      data={data}
      labels={labels}
      onClose={() => onSelect(null)}
      onOpenCategory={() => onSelect({ categoryId, period: null })}
      onStored={stored => onSelect({ categoryId, period: stored })}
    />
  );
}
