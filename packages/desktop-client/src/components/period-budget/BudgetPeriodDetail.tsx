import { useState } from 'react';
import { Trans } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';

import type { BudgetPeriod } from './BudgetPeriods';
import { periodBudgetLink } from './BudgetPeriods';
import { OpenedRow } from './OpenedRow';
import type { Selection } from './selection';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import { usePeriodBudgetLabels } from './usePeriodBudgetLabels';

export function BudgetPeriodDetail({
  entry,
  data,
  asOf,
  onClose,
}: {
  entry: BudgetPeriod;
  data: PeriodBudgetData;
  asOf: string;
  onClose: () => void;
}) {
  const { row, view } = entry;
  const { period } = view;
  const labels = usePeriodBudgetLabels();
  const [selection, setSelection] = useState<Selection>({
    categoryId: row.category.id,
    period: { id: period.id, start: period.start },
  });

  return (
    <View style={{ padding: 8, gap: 8 }}>
      <OpenedRow
        row={row}
        period={selection.period}
        data={data}
        asOf={asOf}
        labels={labels}
        onSelect={next => {
          if (next === null) {
            onClose();
          } else {
            setSelection(next);
          }
        }}
      />
      <Link
        variant="internal"
        to={periodBudgetLink(asOf, row.category.id, period)}
      >
        <Trans>Open full Period Budget</Trans>
      </Link>
    </View>
  );
}
