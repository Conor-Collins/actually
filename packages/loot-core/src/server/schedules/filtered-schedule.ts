import { aqlQuery } from '#server/aql';
import { getBudget, setBudget } from '#server/budget/actions';
import {
  app as periodBudgetApp,
  writeScheduleLink,
} from '#server/period-budget/app';
import { batchMessages } from '#server/sync';
import { app as transactionApp } from '#server/transactions/app';
import { addMonths } from '#shared/months';
import { findOverlappingPeriod } from '#shared/period-store';
import { q } from '#shared/query';
import {
  extractScheduleConds,
  getScheduleCategoryId,
  getScheduledAmount,
  getSchedulePayeeIds,
  isCleanupEligibleSchedule,
} from '#shared/schedules';
import type {
  RuleConditionEntity,
  ScheduleEntity,
  TransactionEntity,
} from '#types/models';

const periods = periodBudgetApp.handlers;

function calendarYear(year: string) {
  if (!/^\d{4}$/.test(year) || Number(year) < 1 || Number(year) >= 9999) {
    throw new Error('Invalid schedule year');
  }
  return { start: year + '-01-01', end: addMonths(year + '-01', 12) + '-01' };
}

export async function createFilteredSchedule(
  {
    schedule,
    conditions,
    year,
  }: {
    schedule: Partial<ScheduleEntity>;
    conditions: RuleConditionEntity[];
    year: string;
  },
  createSchedule: (input: {
    schedule: Partial<ScheduleEntity>;
    conditions: RuleConditionEntity[];
  }) => Promise<string>,
) {
  const { category, date, amount } = extractScheduleConds(conditions);
  if (!category?.value || date?.value?.frequency !== 'yearly' || !amount) {
    throw new Error('A category, yearly repeat and amount are required');
  }

  const { start, end } = calendarYear(year);
  const budget = Math.max(0, -getScheduledAmount(amount.value));
  let scheduleId = '';
  let conflict: { start: string; end: string } | undefined;
  await batchMessages(async () => {
    const rows = await periods['period-budget/get-rows']();
    const existing = rows.periods.find(
      period =>
        !period.tombstone &&
        period.category === category.value &&
        period.start_date === start &&
        period.end_date === end,
    );

    const result = existing
      ? await periods['period-budget/update-period']({
          id: existing.id,
          budget,
        })
      : await periods['period-budget/create-period']({
          category: category.value,
          start,
          end,
          budget,
        });
    if ('error' in result) {
      const overlap = findOverlappingPeriod(
        {
          id: existing?.id,
          category: category.value,
          start_date: start,
          end_date: end,
        },
        rows.periods,
      );
      if (!overlap) {
        throw new Error(result.error);
      }
      conflict = { start: overlap.start, end: overlap.end };
      return;
    }
    const cadence = rows.cadences.find(
      row => row.id === category.value && !row.tombstone,
    );
    if (
      !(
        cadence?.active === true &&
        cadence.months === 12 &&
        cadence.anchor_date?.endsWith('-01')
      )
    ) {
      const result = await periods['period-budget/set-cadence']({
        category: category.value,
        anchorDate: start,
        months: 12,
      });
      if ('error' in result) {
        throw new Error(result.error);
      }
    }
    scheduleId = await createSchedule({ schedule, conditions });
    const link = await writeScheduleLink({
      scheduleId,
      category: category.value,
    });
    if ('error' in link) {
      throw new Error(link.error);
    }
  });
  return conflict ? { conflict } : { id: scheduleId };
}

type CleanupRequest = {
  id: string;
  year: string;
  transactionIds?: string[];
};

export async function previewScheduleCleanup({
  id,
  year,
  transactionIds,
}: CleanupRequest) {
  const { start, end } = calendarYear(year);
  const { data: schedules }: { data: ScheduleEntity[] } = await aqlQuery(
    q('schedules').orderBy('id').select('*'),
  );
  const schedule = schedules.find(schedule => schedule.id === id);
  if (!schedule) {
    throw new Error('Schedule no longer exists');
  }
  const category = getScheduleCategoryId(schedule);
  if (!isCleanupEligibleSchedule(schedule)) {
    throw new Error('Schedule has neither a category nor a payee list');
  }
  const payees = getSchedulePayeeIds(schedule);

  const amounts = category
    ? Array.from({ length: 12 }, (_, index) => {
        const month = addMonths(year + '-01', index);
        return { month, amount: getBudget({ category, month }) };
      }).filter(({ amount }) => amount !== 0)
    : [];

  const replacementCandidates = schedules.flatMap(other => {
    const categoryConditions =
      other._conditions?.filter(condition => condition.field === 'category') ??
      [];
    const [categoryCondition] = categoryConditions;
    const { payees: otherPayees } = extractScheduleConds(other._conditions);
    return other.id !== id &&
      !otherPayees &&
      payees.includes(other._payee) &&
      (categoryConditions.length === 0 ||
        (categoryConditions.length === 1 &&
          categoryCondition.op === 'is' &&
          categoryCondition.value === category))
      ? [{ id: other.id, name: other.name, payee: other._payee }]
      : [];
  });

  const candidateIds = replacementCandidates.map(({ id }) => id);
  const {
    data: existingLinks,
  }: { data: Pick<TransactionEntity, 'schedule'>[] } =
    candidateIds.length > 0
      ? await aqlQuery(
          q('transactions')
            .filter({ schedule: { $oneof: candidateIds } })
            .options({ splits: 'all' })
            .select('schedule'),
        )
      : { data: [] };
  const { scheduleLinks } = await periods['period-budget/get-rows']();
  const protectedIds = new Set([
    ...existingLinks.map(({ schedule }) => schedule),
    ...scheduleLinks.filter(link => !link.tombstone).map(link => link.id),
  ]);
  const replacements = replacementCandidates.filter(
    ({ id }) => !protectedIds.has(id),
  );
  const { data: links }: { data: TransactionEntity[] } =
    transactionIds?.length === 0
      ? { data: [] }
      : await aqlQuery(
          q('transactions')
            .filter({
              date: { $gte: start, $lt: end },
              'account.offbudget': false,
              ...(category ? { category } : {}),
              ...(transactionIds
                ? { id: { $oneof: transactionIds } }
                : {
                    ...(payees.length ? { payee: { $oneof: payees } } : {}),
                    ...(schedule._account
                      ? { account: schedule._account }
                      : {}),
                  }),
            })
            .options({ splits: 'all' })
            .orderBy('id')
            .select('*'),
        );
  const { data: moves }: { data: TransactionEntity[] } =
    category && payees.length > 0
      ? await aqlQuery(
          q('transactions')
            .filter({
              date: { $gte: start, $lt: end },
              payee: { $oneof: payees },
              'account.offbudget': false,
            })
            .options({ splits: 'all' })
            .orderBy('id')
            .select('*'),
        )
      : { data: [] };
  return {
    category,
    amounts,
    replacements,
    links: links.filter(
      transaction =>
        !transaction.schedule &&
        !transaction.starting_balance_flag &&
        !transaction.is_parent,
    ),
    moves: moves.filter(
      transaction =>
        transaction.category &&
        transaction.category !== category &&
        !transaction.is_parent &&
        !transaction.transfer_id &&
        !transaction.starting_balance_flag,
    ),
  };
}

type CleanupPlan = Awaited<ReturnType<typeof previewScheduleCleanup>>;
type CleanupAction = Exclude<keyof CleanupPlan, 'category'>;

export async function applyScheduleCleanup(
  {
    request,
    plan,
    actions,
  }: {
    request: CleanupRequest;
    plan: CleanupPlan;
    actions: CleanupAction[];
  },
  deleteSchedule: (input: { id: string }) => Promise<void>,
) {
  const current = await previewScheduleCleanup(request);
  if (
    current.category !== plan.category ||
    actions.some(
      action =>
        JSON.stringify(current[action]) !== JSON.stringify(plan[action]),
    )
  ) {
    return { changed: true };
  }
  const { category } = current;
  const edits = new Map<
    string,
    Partial<{ category: string; schedule: string }>
  >();

  await batchMessages(async () => {
    if (category && actions.includes('amounts')) {
      for (const { month } of current.amounts) {
        await setBudget({ category, month, amount: 0 });
      }
    }
    if (actions.includes('replacements')) {
      for (const { id } of current.replacements) {
        await deleteSchedule({ id });
      }
    }
    if (actions.includes('links')) {
      for (const { id } of current.links) {
        edits.set(id, { schedule: request.id });
      }
    }
    if (category && actions.includes('moves')) {
      for (const { id } of current.moves) {
        edits.set(id, { ...edits.get(id), category });
      }
    }
    if (edits.size > 0) {
      await transactionApp.handlers['transactions-batch-update']({
        updated: [...edits].map(([id, fields]) => ({ id, ...fields })),
        runTransfers: false,
      });
    }
  });
  return { changed: false };
}
