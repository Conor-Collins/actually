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

  // Use the widest run of non-amount columns even when the user reorders them.
  let summaryStart = 0;
  let summaryEnd = 0;
  let summaryWidth = 0;
  let runStart = 0;
  let runWidth = 0;
  for (const [index, column] of columns.entries()) {
    if (column === 'payment' || column === 'deposit') {
      runStart = index + 1;
      runWidth = 0;
    } else {
      runWidth += columnWidths[column].endsWith('px')
        ? parseInt(columnWidths[column], 10)
        : 128;
      if (runWidth > summaryWidth) {
        summaryStart = runStart;
        summaryEnd = index + 1;
        summaryWidth = runWidth;
      }
    }
  }

  const tracks = columns.map(column => columnWidths[column]);
  const minimumSummaryWidth = 320;
  const summaryNeedsOwnRow = summaryWidth < minimumSummaryWidth;
  const fixedColumns = tracks.every(track => track.endsWith('px'));
  const fixedWidth =
    20 + tracks.reduce((width, track) => width + (parseInt(track, 10) || 0), 0);
  if (fixedColumns) tracks.push('minmax(0, 1fr)');

  // Fixed columns leave the remaining register width available for the summary.
  const wideSparseLayout =
    summaryNeedsOwnRow && fixedColumns
      ? css({
          containerType: 'inline-size',
          [`@container (min-width: ${fixedWidth + minimumSummaryWidth}px)`]: {
            '& > [data-totals-summary]': {
              '--totals-summary-column': '-2 / -1',
            },
            '& > [data-totals-amount]': { '--totals-amount-row': 1 },
          },
        })
      : undefined;

  return (
    <div
      aria-label={t('Sum of shown posted transactions')}
      role="group"
      className={wideSparseLayout}
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
          gridColumn: wideSparseLayout
            ? 'var(--totals-summary-column, 1 / -1)'
            : summaryNeedsOwnRow
              ? '1 / -1'
              : `${summaryStart + 2} / ${summaryEnd + 2}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 5px',
        }}
      >
        <span>
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
        {(['payment', 'deposit'] satisfies Array<keyof TransactionTotals>)
          .filter(column => !columns.includes(column))
          .map(column => (
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
                gridRow: wideSparseLayout
                  ? 'var(--totals-amount-row, 2)'
                  : summaryNeedsOwnRow
                    ? 2
                    : 1,
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
