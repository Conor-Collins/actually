import { send } from '@actual-app/core/platform/client/connection';
import * as months from '@actual-app/core/shared/months';
import type { Query } from '@actual-app/core/shared/query';
import type {
  RuleConditionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';

import { SPECIAL_VIEW_IDS } from '#hooks/useTransactionTableColumns';

export type AccountFilter =
  | Partial<RuleConditionEntity>
  | TransactionFilterEntity;
export type DateRange = { start: string; end: string };

export function isDateFilter(condition: AccountFilter) {
  return 'field' in condition && condition.field === 'date';
}

export function monthFilter(month: string): RuleConditionEntity {
  return { field: 'date', op: 'is', value: month, options: { month: true } };
}

export function rangeFilters({ start, end }: DateRange): RuleConditionEntity[] {
  return [
    { field: 'date', op: 'gte', value: start },
    { field: 'date', op: 'lte', value: end },
  ];
}

export function monthRange(start: string, end = start): DateRange {
  return {
    start: months.firstDayOfMonth(start),
    end: months.lastDayOfMonth(end),
  };
}

function asDay(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return;
  const text = String(value);
  const day = /^\d{8}$/.test(text)
    ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}`
    : text;
  if (months.isValidYearMonthDay(day)) return day;
}

function dateBetween(condition: AccountFilter): DateRange | undefined {
  if (
    !('field' in condition) ||
    condition.field !== 'date' ||
    condition.op !== 'isbetween' ||
    !condition.value ||
    typeof condition.value !== 'object' ||
    !('num1' in condition.value) ||
    !('num2' in condition.value)
  ) {
    return;
  }
  const first = asDay(condition.value.num1);
  const second = asDay(condition.value.num2);
  if (first && second) {
    return first <= second
      ? { start: first, end: second }
      : { start: second, end: first };
  }
}

export function describeDateFilters(conditions: AccountFilter[]) {
  let start: string | undefined;
  let end: string | undefined;
  for (const condition of conditions) {
    if (!('field' in condition) || condition.field !== 'date') continue;

    const between = dateBetween(condition);
    let bounds: Partial<DateRange>;
    if (between) {
      bounds = between;
    } else if (typeof condition.value !== 'string') {
      return;
    } else if (
      condition.op === 'is' &&
      months.isValidYearMonth(condition.value)
    ) {
      bounds = monthRange(condition.value);
    } else if (condition.op === 'is' && /^\d{4}$/.test(condition.value)) {
      bounds = {
        start: `${condition.value}-01-01`,
        end: `${condition.value}-12-31`,
      };
    } else {
      const day = asDay(condition.value);
      if (!day) return;
      switch (condition.op) {
        case 'is':
          bounds = { start: day, end: day };
          break;
        case 'isapprox':
          bounds = {
            start: months.subDays(day, 2),
            end: months.addDays(day, 2),
          };
          break;
        case 'gte':
          bounds = { start: day };
          break;
        case 'gt':
          bounds = { start: months.addDays(day, 1) };
          break;
        case 'lte':
          bounds = { end: day };
          break;
        case 'lt':
          bounds = { end: months.subDays(day, 1) };
          break;
        default:
          return;
      }
    }
    if (bounds.start && (!start || bounds.start > start)) start = bounds.start;
    if (bounds.end && (!end || bounds.end < end)) end = bounds.end;
  }
  if (start && end && start > end) return;
  return { start, end };
}

async function compileConditions(
  conditions: AccountFilter[],
): Promise<unknown[]> {
  const rules: AccountFilter[] = [];
  const expressions: unknown[] = [];
  for (const condition of conditions) {
    const between = dateBetween(condition);
    if (between) {
      expressions.push({ date: { $gte: between.start, $lte: between.end } });
    } else if ('customName' in condition && condition.customName) {
      if (condition.queryFilter) expressions.push(condition.queryFilter);
    } else {
      rules.push(condition);
    }
  }

  if (rules.length > 0) {
    const { filters } = await send('make-filters-from-conditions', {
      conditions: rules,
    });
    expressions.push(...filters);
  }
  return expressions;
}

export function initialAccountFilters(
  accountId: string | undefined,
  conditions: RuleConditionEntity[],
  hasCallerScope: boolean,
) {
  if (
    conditions.length ||
    hasCallerScope ||
    accountId === 'closed' ||
    (accountId && SPECIAL_VIEW_IDS.includes(accountId))
  ) {
    return splitAccountFilters(conditions, 'and');
  }
  return {
    filterConditions: [],
    rangeConditions: [monthFilter(months.currentMonth())],
  };
}

export function splitAccountFilters(
  conditions: RuleConditionEntity[],
  op: 'and' | 'or',
) {
  return op === 'or'
    ? { filterConditions: conditions, rangeConditions: [] }
    : {
        filterConditions: conditions.filter(
          condition => !isDateFilter(condition),
        ),
        rangeConditions: conditions.filter(isDateFilter),
      };
}

function applyExpressions(
  root: Query,
  expressions: unknown[],
  op: 'and' | 'or',
) {
  return expressions.length
    ? root.filter({ [op === 'or' ? '$or' : '$and']: expressions })
    : root;
}

export async function accountDateQueries(
  root: Query,
  conditions: AccountFilter[],
  conditionsOp: 'and' | 'or',
  range: AccountFilter[],
) {
  const [dates, other, rangeExpressions] = await Promise.all([
    compileConditions(conditions.filter(isDateFilter)),
    compileConditions(conditions.filter(condition => !isDateFilter(condition))),
    compileConditions(range),
  ]);

  return {
    dateFree: applyExpressions(root, other, conditionsOp),
    dated: applyExpressions(
      applyExpressions(root, [...other, ...dates], conditionsOp),
      rangeExpressions,
      'and',
    ),
  };
}
