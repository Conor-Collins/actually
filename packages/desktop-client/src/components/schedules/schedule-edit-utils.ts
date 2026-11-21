import {
  extractScheduleConds,
  getScheduleCategoryId,
  getSchedulePayeeIds,
} from '@actual-app/core/shared/schedules';
import { ungroupTransactions } from '@actual-app/core/shared/transactions';
import type {
  RecurConfig,
  RuleConditionEntity,
  RuleConditionOp,
  ScheduleEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';
import { t } from 'i18next';

import type { ScheduleFormFields } from './ScheduleEditForm';

export function updateScheduleConditions(
  schedule: Partial<ScheduleEntity>,
  fields: ScheduleFormFields,
): { error?: string; conditions?: RuleConditionEntity[] } {
  const conds = extractScheduleConds(schedule._conditions);
  const hadEmptyCategory = Boolean(
    conds.category && !getScheduleCategoryId(schedule),
  );
  const hadEmptyPayee = Boolean(
    (conds.payees || conds.payee) && getSchedulePayeeIds(schedule).length === 0,
  );
  const existingAccountId =
    typeof conds.account?.value === 'string' &&
    conds.account.value.trim().length > 0
      ? conds.account.value
      : null;
  const hadEmptyAccount = Boolean(conds.account && !existingAccountId);
  const nextCategory =
    typeof fields.category === 'string' ? fields.category.trim() : '';
  const nextAccount =
    typeof fields.account === 'string' ? fields.account.trim() : '';

  const updateCond = (
    cond: ReturnType<typeof extractScheduleConds>[keyof ReturnType<
      typeof extractScheduleConds
    >],
    op: RuleConditionOp,
    field: string,
    value: (typeof fields)[keyof typeof fields],
  ) => {
    if (cond) {
      return { ...cond, value };
    }

    if (value != null) {
      return { op, field, value };
    }

    return null;
  };

  // Validate
  if (fields.date == null) {
    return { error: t('Date is required'), conditions: [] };
  }

  if (fields.amount == null) {
    return { error: t('A valid amount is required'), conditions: [] };
  }

  return {
    conditions: [
      fields.payees.length > 1 ||
      (fields.payees.length === 1 &&
        (Boolean(conds.payees) ||
          (Boolean(nextCategory) && (!conds.payee || !conds.category))))
        ? updateCond(conds.payees, 'oneOf', 'payee', fields.payees)
        : fields.payees.length === 1
          ? updateCond(conds.payee, 'is', 'payee', fields.payees[0])
          : hadEmptyPayee
            ? (conds.payees ?? conds.payee)
            : null,
      nextCategory
        ? updateCond(conds.category, 'is', 'category', fields.category)
        : hadEmptyCategory
          ? conds.category
          : null,
      nextAccount
        ? updateCond(conds.account, 'is', 'account', fields.account)
        : hadEmptyAccount
          ? conds.account
          : null,
      updateCond(conds.date, 'isapprox', 'date', fields.date),
      // We don't use `updateCond` for amount because we want to
      // overwrite it completely
      {
        op: (fields.amountOp || 'isapprox') as RuleConditionOp,
        field: 'amount',
        value: fields.amount,
      },
    ].filter((val): val is RuleConditionEntity => val != null),
  };
}

export function getScheduleFilter(
  conditions: (Partial<RuleConditionEntity> | TransactionFilterEntity)[],
  op: 'and' | 'or',
) {
  if (op === 'or') {
    return null;
  }

  const categories = conditions.flatMap(condition =>
    'field' in condition &&
    condition.field === 'category' &&
    condition.op === 'is' &&
    typeof condition.value === 'string' &&
    condition.value.length > 0
      ? [condition.value]
      : [],
  );
  if (new Set(categories).size !== 1) {
    return null;
  }

  const year = conditions.find(
    condition =>
      'field' in condition &&
      condition.field === 'date' &&
      condition.op === 'is' &&
      condition.options?.year,
  );
  const yearValue = year && 'value' in year ? year.value : undefined;
  return {
    category: categories[0],
    year: typeof yearValue === 'string' ? yearValue.slice(0, 4) : undefined,
  };
}

export function prefillFilteredSchedule({
  category,
  name,
  year,
  transactions,
}: {
  category: string;
  name: string;
  year?: string;
  transactions: TransactionEntity[];
}) {
  const matches = ungroupTransactions(transactions).filter(
    transaction =>
      !transaction.is_parent &&
      !transaction._unmatched &&
      !transaction._deleted,
  );
  const firstDate = matches.map(transaction => transaction.date).sort()[0];
  if (!firstDate) {
    return null;
  }
  const periodYear = year ?? firstDate.slice(0, 4);
  if (
    matches.some(transaction => transaction.date.slice(0, 4) !== periodYear)
  ) {
    return null;
  }
  const payees = [
    ...new Set(
      matches.flatMap(transaction =>
        transaction.payee ? [transaction.payee] : [],
      ),
    ),
  ];
  const account = matches[0].account;
  const date = {
    frequency: 'yearly',
    start: firstDate,
    endMode: 'never',
  } satisfies RecurConfig;

  const schedule = {
    name,
    posts_transaction: false,
    _date: date,
    _amount: matches.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    ),
    _amountOp: 'isapprox',
    _conditions: [
      { field: 'category', op: 'is', value: category },
      { field: 'date', op: 'isapprox', value: date },
      ...(payees.length > 0
        ? [
            {
              field: 'payee',
              op: 'oneOf',
              value: payees,
            } satisfies RuleConditionEntity,
          ]
        : []),
    ],
    _actions: [],
    ...(matches.every(transaction => transaction.account === account)
      ? { _account: account }
      : {}),
  } satisfies Partial<ScheduleEntity>;
  return { schedule, transactions: matches, category, year: periodYear };
}

export type FilteredSchedule = NonNullable<
  ReturnType<typeof prefillFilteredSchedule>
>;
