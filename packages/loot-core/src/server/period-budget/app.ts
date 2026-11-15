import { createApp } from '#server/app';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import {
  cadenceEnd,
  checkPeriodWrite,
  isValidDay,
  isWholeNumber,
  newPeriodId,
} from '#shared/period-store';
import { q } from '#shared/query';
import type {
  PeriodAccountRow,
  PeriodBudgetRow,
  PeriodBudgetRows,
  PeriodCadenceRow,
  PeriodChargeOverrideRow,
  PeriodOffsetRow,
  PeriodScheduleLinkRow,
} from '#types/models';

export type PeriodWriteResult = { id: string } | { error: string };

type PeriodTable =
  | 'period_cadences'
  | 'period_budgets'
  | 'period_offsets'
  | 'period_schedule_links'
  | 'period_charge_overrides'
  | 'period_accounts';

type FieldValue = string | number | boolean | null;

export type PeriodBudgetHandlers = {
  'period-budget/get-rows': typeof getRows;
  'period-budget/set-cadence': typeof setCadence;
  'period-budget/stop-cadence': typeof stopCadence;
  'period-budget/create-period': typeof createPeriod;
  'period-budget/update-period': typeof updatePeriod;
  'period-budget/delete-period': typeof deletePeriod;
  'period-budget/restore-period': typeof restorePeriod;
  'period-budget/carry': typeof carry;
};

export const app = createApp<PeriodBudgetHandlers>();
app.method('period-budget/get-rows', getRows);
app.method('period-budget/set-cadence', mutator(undoable(setCadence)));
app.method('period-budget/stop-cadence', mutator(undoable(stopCadence)));
app.method('period-budget/create-period', mutator(undoable(createPeriod)));
app.method('period-budget/update-period', mutator(undoable(updatePeriod)));
app.method('period-budget/delete-period', mutator(undoable(deletePeriod)));
app.method('period-budget/restore-period', mutator(undoable(restorePeriod)));
app.method('period-budget/carry', mutator(undoable(carry)));

// Reads every row of a table, deleted rows too, sorted by id.
async function readTable<T extends { id: string }>(
  table: PeriodTable,
): Promise<T[]> {
  const { data } = await aqlQuery(q(table).select('*').withDead());
  const rows: T[] = data;
  return [...rows].sort((a, b) => {
    if (a.id === b.id) {
      return 0;
    }
    return a.id < b.id ? -1 : 1;
  });
}

async function getRows(): Promise<PeriodBudgetRows> {
  return {
    cadences: await readTable<PeriodCadenceRow>('period_cadences'),
    periods: await readTable<PeriodBudgetRow>('period_budgets'),
    offsets: await readTable<PeriodOffsetRow>('period_offsets'),
    scheduleLinks: await readTable<PeriodScheduleLinkRow>(
      'period_schedule_links',
    ),
    chargeOverrides: await readTable<PeriodChargeOverrideRow>(
      'period_charge_overrides',
    ),
    accounts: await readTable<PeriodAccountRow>('period_accounts'),
  };
}

// Inserts the row, or updates it when the id exists (a deleted row comes
// back). Sending `tombstone: false` lets the later of "clear" and "set" win
// when two devices disagree.
async function writeRow(
  table: PeriodTable,
  id: string,
  fields: Record<string, FieldValue>,
): Promise<void> {
  const existing = await db.first<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ?`,
    [id],
  );
  if (existing === null) {
    await db.insertWithSchema(table, { id, ...fields });
    return;
  }
  await db.updateWithSchema(table, { id, ...fields, tombstone: false });
}

async function exists(
  table: 'categories' | 'accounts' | 'schedules',
  id: string,
): Promise<boolean> {
  const row = await db.first<{ id: string }>(
    `SELECT id FROM ${table} WHERE id = ? AND tombstone = 0`,
    [id],
  );
  return row !== null;
}

function isAmount(value: unknown): value is number {
  return isWholeNumber(value) && value >= 0;
}

async function setCadence({
  category,
  anchorDate,
  months,
  budget,
}: {
  category: string;
  anchorDate: string;
  months: number;
  budget?: number;
}): Promise<PeriodWriteResult> {
  if (!(await exists('categories', category))) {
    return { error: `category "${category}" does not exist` };
  }
  if (!isValidDay(anchorDate)) {
    return { error: `start date "${String(anchorDate)}" is not a valid date` };
  }
  if (!isWholeNumber(months) || months < 1 || months > 120) {
    return { error: 'length must be a whole number of months from 1 to 120' };
  }
  if (budget !== undefined && !isAmount(budget)) {
    return { error: 'budget must be a whole number that is not negative' };
  }
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const hasPeriods = periods.some(row => row.category === category);
  await batchMessages(async () => {
    await writeRow('period_cadences', category, {
      anchor_date: anchorDate,
      months,
      active: true,
    });
    if (budget !== undefined && !hasPeriods) {
      const id = newPeriodId(
        category,
        anchorDate,
        new Set(periods.map(p => p.id)),
      );
      const end_date = cadenceEnd(anchorDate, months, Number(anchorDate.slice(8, 10)));
      await db.insertWithSchema('period_budgets', {
        id,
        category,
        start_date: anchorDate,
        end_date,
        budget,
        carryover: 0,
        carried_from: null,
      });
    }
  });
  return { id: category };
}

async function stopCadence({
  category,
}: {
  category: string;
}): Promise<PeriodWriteResult> {
  const cadences = await readTable<PeriodCadenceRow>('period_cadences');
  const cadence = cadences.find(row => row.id === category && !row.tombstone);
  if (cadence === undefined) {
    return { error: `category "${category}" has no cadence` };
  }
  await db.updateWithSchema('period_cadences', { id: category, active: false });
  return { id: category };
}

async function createPeriod({
  category,
  start,
  end,
  budget,
}: {
  category: string;
  start: string;
  end: string;
  budget: number;
}): Promise<PeriodWriteResult> {
  if (!(await exists('categories', category))) {
    return { error: `category "${category}" does not exist` };
  }
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const id = newPeriodId(category, start, new Set(periods.map(p => p.id)));
  const error = checkPeriodWrite({
    candidate: { id, category, start_date: start, end_date: end, budget, carryover: 0 },
    periods,
  });
  if (error !== null) {
    return { error };
  }
  await db.insertWithSchema('period_budgets', {
    id,
    category,
    start_date: start,
    end_date: end,
    budget,
    carryover: 0,
    carried_from: null,
  });
  return { id };
}

function checkStoredPeriod(
  row: PeriodBudgetRow,
  changes: { start?: string; end?: string; budget?: number },
  periods: readonly PeriodBudgetRow[],
): string | null {
  const candidate = {
    id: row.id,
    category: row.category ?? '',
    start_date: changes.start ?? row.start_date ?? '',
    end_date: changes.end ?? row.end_date ?? '',
    budget: changes.budget ?? row.budget ?? 0,
    carryover: row.carryover ?? 0,
  };
  return checkPeriodWrite({ candidate, periods });
}

async function updatePeriod({
  id,
  start,
  end,
  budget,
}: {
  id: string;
  start?: string;
  end?: string;
  budget?: number;
}): Promise<PeriodWriteResult> {
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const row = periods.find(p => p.id === id && !p.tombstone);
  if (row === undefined) {
    return { error: `period "${id}" does not exist` };
  }
  const error = checkStoredPeriod(row, { start, end, budget }, periods);
  if (error !== null) {
    return { error };
  }
  const fields: Record<string, FieldValue> = {};
  if (start !== undefined) {
    fields.start_date = start;
  }
  if (end !== undefined) {
    fields.end_date = end;
  }
  if (budget !== undefined) {
    fields.budget = budget;
  }
  await db.updateWithSchema('period_budgets', { id, ...fields });
  return { id };
}

async function deletePeriod({ id }: { id: string }): Promise<PeriodWriteResult> {
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const row = periods.find(p => p.id === id && !p.tombstone);
  if (row === undefined) {
    return { error: `period "${id}" does not exist` };
  }
  await db.delete_('period_budgets', id);
  return { id };
}

async function restorePeriod({ id }: { id: string }): Promise<PeriodWriteResult> {
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const row = periods.find(p => p.id === id && p.tombstone);
  if (row === undefined) {
    return { error: `period "${id}" is not deleted` };
  }
  const error = checkStoredPeriod(row, {}, periods);
  if (error !== null) {
    return { error };
  }
  await db.updateWithSchema('period_budgets', { id, tombstone: false });
  return { id };
}

async function carry({
  id,
  fromPeriodId,
  amount,
}: {
  id: string;
  fromPeriodId: string | null;
  amount: number;
}): Promise<PeriodWriteResult> {
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const row = periods.find(p => p.id === id && !p.tombstone);
  if (row === undefined) {
    return { error: `period "${id}" does not exist` };
  }
  if (!isWholeNumber(amount)) {
    return { error: 'carryover must be a whole number' };
  }
  if (fromPeriodId === null) {
    if (amount !== 0) {
      return { error: 'a carry without a period must be 0' };
    }
  } else {
    const from = periods.find(p => p.id === fromPeriodId && !p.tombstone);
    if (from === undefined) {
      return { error: `period "${fromPeriodId}" does not exist` };
    }
    if (from.category !== row.category) {
      return { error: 'carry must come from a period of the same category' };
    }
    if (from.end_date === null || row.start_date === null || from.end_date > row.start_date) {
      return { error: 'carry must come from an earlier period' };
    }
  }
  await db.updateWithSchema('period_budgets', {
    id,
    carryover: amount,
    carried_from: fromPeriodId,
  });
  return { id };
}
