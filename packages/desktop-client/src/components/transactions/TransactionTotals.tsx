import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import type { Query } from '@actual-app/core/shared/query';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { aqlQuery } from '#queries/aqlQuery';

import type { TransactionTableColumnId } from './table/columns';

export type TransactionTotals = { payment: number; deposit: number };

export function selectTransactionGroups(query: Query) {
  return query.select(['id', 'date', 'amount', 'is_parent']);
}

export type TransactionGroup = Pick<
  TransactionEntity,
  'id' | 'date' | 'amount' | '_unmatched' | 'subtransactions'
>;

export function* displayedTransactionGroups(
  groups: readonly TransactionGroup[],
) {
  const seen = new Set<string>();
  for (const group of groups) {
    if (seen.has(group.id)) continue;
    seen.add(group.id);
    const amount = group._unmatched
      ? (group.subtransactions ?? []).reduce(
          (sum, child) => sum + (child._unmatched ? 0 : child.amount),
          0,
        )
      : group.amount;
    yield { date: group.date, amount };
  }
}

export async function getTransactionTotals(
  query: Query,
): Promise<TransactionTotals> {
  const { data }: { data: TransactionGroup[] } = await aqlQuery(
    selectTransactionGroups(query),
  );
  return sumTransactionGroups(data);
}

function sumTransactionGroups(
  groups: readonly TransactionGroup[],
): TransactionTotals {
  let payment = 0;
  let deposit = 0;
  for (const { amount } of displayedTransactionGroups(groups)) {
    if (amount < 0) payment -= amount;
    else deposit += amount;
  }
  return { payment, deposit };
}

export function updateTransactionTotals(
  totals: TransactionTotals,
  previousGroups: readonly TransactionGroup[],
  updatedGroups: readonly TransactionGroup[],
): TransactionTotals {
  const previous = sumTransactionGroups(previousGroups);
  const updated = sumTransactionGroups(updatedGroups);
  return {
    payment: totals.payment + updated.payment - previous.payment,
    deposit: totals.deposit + updated.deposit - previous.deposit,
  };
}

export function TransactionTotalsRow({
  columns,
  amountColumnWidths,
  scrollWidth,
  totals,
}: {
  columns: TransactionTableColumnId[];
  amountColumnWidths: { amount: number; balance: number };
  scrollWidth: number;
  totals: TransactionTotals;
}) {
  const format = useFormat();
  const { t } = useTranslation();
  const columnWidths = {
    date: '110px',
    payment: `${amountColumnWidths.amount}px`,
    deposit: `${amountColumnWidths.amount}px`,
    balance: `${amountColumnWidths.balance}px`,
    cleared: '38px',
    account: 'minmax(0, 1fr)',
    payee: 'minmax(0, 1fr)',
    notes: 'minmax(0, 1fr)',
    category: 'minmax(0, 1fr)',
    group: 'minmax(0, 1fr)',
  } satisfies Record<TransactionTableColumnId, string>;

  const flexTrack = 'minmax(0, 1fr)';
  const tracks = columns.map(column => columnWidths[column]);
  const totalFixedWidth =
    20 + tracks.reduce((width, track) => width + (parseInt(track, 10) || 0), 0);
  const totalFlexCount = tracks.filter(track => track === flexTrack).length;
  const hiddenAmounts = (
    ['payment', 'deposit'] satisfies Array<keyof TransactionTotals>
  ).filter(column => !columns.includes(column));
  const minimumCompactWidth = 130 + hiddenAmounts.length * 110;
  const minimumFullWidth = 320 + hiddenAmounts.length * 110;
  const runs: {
    start: number;
    end: number;
    fixedWidth: number;
    flexCount: number;
  }[] = [];
  let run = { start: 0, end: 0, fixedWidth: 0, flexCount: 0 };
  for (const [index, column] of columns.entries()) {
    if (column === 'payment' || column === 'deposit') {
      run = { start: index + 1, end: index + 1, fixedWidth: 0, flexCount: 0 };
      continue;
    }
    const track = columnWidths[column];
    run = {
      ...run,
      end: index + 1,
      fixedWidth: run.fixedWidth + (parseInt(track, 10) || 0),
      flexCount: run.flexCount + Number(track === flexTrack),
    };
    runs.push(run);
  }

  const hasTrailingTrack =
    totalFlexCount === 0 &&
    !runs.some(run => run.fixedWidth >= minimumFullWidth);
  if (hasTrailingTrack) tracks.push(flexTrack);

  function singleRowLayout(minimumWidth: number) {
    let layout = {
      width: hasTrailingTrack ? totalFixedWidth + minimumWidth : Infinity,
      column: '-2 / -1',
    };
    for (const { start, end, fixedWidth, flexCount } of runs) {
      if (fixedWidth < minimumWidth && flexCount === 0) continue;
      const width =
        fixedWidth >= minimumWidth
          ? totalFixedWidth
          : totalFixedWidth +
            Math.ceil(
              ((minimumWidth - fixedWidth) * totalFlexCount) / flexCount,
            );
      if (width < layout.width) {
        layout = { width, column: `${start + 2} / ${end + 2}` };
      }
    }
    return layout;
  }

  const compact = singleRowLayout(minimumCompactWidth);
  const full = singleRowLayout(minimumFullWidth);
  const alwaysFull = full.width === totalFixedWidth;
  const alwaysCompact = compact.width === totalFixedWidth;
  function placement(column: string) {
    return {
      '& > [data-totals-summary]': { '--totals-summary-column': column },
      '& > [data-totals-amount]': { '--totals-amount-row': 1 },
    };
  }
  const responsiveLayout = alwaysFull
    ? undefined
    : css({
        containerType: 'inline-size',
        '& [data-totals-label]': { display: 'none' },
        [`@container (min-width: ${compact.width}px)`]: placement(
          compact.column,
        ),
        [`@container (min-width: ${full.width}px)`]: {
          ...placement(full.column),
          '& [data-totals-label]': { display: 'inline' },
        },
      });

  return (
    <div
      aria-label={t('Sum of shown posted transactions')}
      role="group"
      className={responsiveLayout}
      style={{
        ...styles.smallText,
        display: 'grid',
        gridTemplateColumns: `20px ${tracks.join(' ')}`,
        alignItems: 'center',
        flexShrink: 0,
        minHeight: 36,
        whiteSpace: 'nowrap',
        backgroundColor: theme.tableHeaderBackground,
        color: theme.tableHeaderText,
        borderTop: '1px solid ' + theme.tableBorder,
        paddingRight: 5 + scrollWidth,
      }}
    >
      <div
        data-totals-summary=""
        style={{
          gridRow: 1,
          gridColumn: alwaysFull
            ? full.column
            : `var(--totals-summary-column, ${alwaysCompact ? compact.column : '1 / -1'})`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 5px',
        }}
      >
        <span data-totals-label="">
          <Trans>Sum of shown posted transactions</Trans>
        </span>
        <span>
          <Trans>Net</Trans>{' '}
          <PrivacyFilter>
            <FinancialText
              aria-label={t('Net total')}
              style={{ fontWeight: 600 }}
            >
              {format(totals.deposit - totals.payment, 'financial')}
            </FinancialText>
          </PrivacyFilter>
        </span>
        {hiddenAmounts.map(column => (
          <span key={column}>
            {column === 'payment' ? (
              <Trans>Payment</Trans>
            ) : (
              <Trans>Deposit</Trans>
            )}{' '}
            <PrivacyFilter>
              <FinancialText>
                {format(totals[column], 'financial')}
              </FinancialText>
            </PrivacyFilter>
          </span>
        ))}
      </div>
      {columns.map(
        (column, index) =>
          (column === 'payment' || column === 'deposit') && (
            <div
              key={column}
              data-totals-amount=""
              style={{
                gridRow: alwaysFull
                  ? 1
                  : `var(--totals-amount-row, ${alwaysCompact ? 1 : 2})`,
                gridColumn: index + 2,
                textAlign: 'right',
                padding: '4px 5px',
              }}
            >
              <PrivacyFilter>
                <FinancialText
                  aria-label={
                    column === 'payment'
                      ? t('Total payments')
                      : t('Total deposits')
                  }
                  style={{ fontWeight: 600 }}
                >
                  {format(totals[column], 'financial')}
                </FinancialText>
              </PrivacyFilter>
            </div>
          ),
      )}
    </div>
  );
}
