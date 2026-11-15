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
  'period-budget/set-offset': typeof setOffset;
  'period-budget/clear-offset': typeof clearOffset;
  'period-budget/link-schedule': typeof linkSchedule;
  'period-budget/unlink-schedule': typeof unlinkSchedule;
  'period-budget/set-charge-override': typeof setChargeOverride;
  'period-budget/clear-charge-override': typeof clearChargeOverride;
  'period-budget/exclude-account': typeof excludeAccount;
  'period-budget/include-account': typeof includeAccount;
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
app.method('period-budget/set-offset', mutator(undoable(setOffset)));
app.method('period-budget/clear-offset', mutator(undoable(clearOffset)));
app.method('period-budget/link-schedule', mutator(undoable(linkSchedule)));
app.method('period-budget/unlink-schedule', mutator(undoable(unlinkSchedule)));
app.method(
  'period-budget/set-charge-override',
  mutator(undoable(setChargeOverride)),
);
app.method(
  'period-budget/clear-charge-override',
  mutator(undoable(clearChargeOverride)),
);
app.method('period-budget/exclude-account', mutator(undoable(excludeAccount)));
app.method('period-budget/include-account', mutator(undoable(includeAccount)));

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
      const end_date = cadenceEnd(
        anchorDate,
        months,
        Number(anchorDate.slice(8, 10)),
      );
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
    candidate: {
      id,
      category,
      start_date: start,
      end_date: end,
      budget,
      carryover: 0,
    },
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

async function deletePeriod({
  id,
}: {
  id: string;
}): Promise<PeriodWriteResult> {
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const row = periods.find(p => p.id === id && !p.tombstone);
  if (row === undefined) {
    return { error: `period "${id}" does not exist` };
  }
  await db.delete_('period_budgets', id);
  return { id };
}

async function restorePeriod({
  id,
}: {
  id: string;
}): Promise<PeriodWriteResult> {
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
    if (
      from.end_date === null ||
      row.start_date === null ||
      from.end_date > row.start_date
    ) {
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

async function setOffset({
  transactionId,
  periodId,
}: {
  transactionId: string;
  periodId: string;
}): Promise<PeriodWriteResult> {
  const transaction = await db.getTransaction(transactionId);
  if (transaction === undefined) {
    return { error: `transaction "${transactionId}" does not exist` };
  }
  const periods = await readTable<PeriodBudgetRow>('period_budgets');
  const period = periods.find(p => p.id === periodId && !p.tombstone);
  if (period === undefined) {
    return { error: `period "${periodId}" does not exist` };
  }
  if (transaction.category !== period.category) {
    return { error: "the transaction is not in the period's category" };
  }
  await writeRow('period_offsets', transactionId, { period_id: periodId });
  return { id: transactionId };
}

async function clearOffset({
  transactionId,
}: {
  transactionId: string;
}): Promise<PeriodWriteResult> {
  const offsets = await readTable<PeriodOffsetRow>('period_offsets');
  const row = offsets.find(o => o.id === transactionId && !o.tombstone);
  if (row === undefined) {
    return { error: `transaction "${transactionId}" has no offset` };
  }
  await db.delete_('period_offsets', transactionId);
  return { id: transactionId };
}

async function linkSchedule({
  scheduleId,
  category,
}: {
  scheduleId: string;
  category: string;
}): Promise<PeriodWriteResult> {
  if (!(await exists('schedules', scheduleId))) {
    return { error: `schedule "${scheduleId}" does not exist` };
  }
  if (!(await exists('categories', category))) {
    return { error: `category "${category}" does not exist` };
  }
  await writeRow('period_schedule_links', scheduleId, { category });
  return { id: scheduleId };
}

async function unlinkSchedule({
  scheduleId,
}: {
  scheduleId: string;
}): Promise<PeriodWriteResult> {
  const links = await readTable<PeriodScheduleLinkRow>('period_schedule_links');
  const row = links.find(l => l.id === scheduleId && !l.tombstone);
  if (row === undefined) {
    return { error: `schedule "${scheduleId}" is not linked` };
  }
  await db.delete_('period_schedule_links', scheduleId);
  return { id: scheduleId };
}

async function setChargeOverride({
  scheduleId,
  dueDate,
  amount,
  skipped,
  transactionId,
  openAmount,
}: {
  scheduleId: string;
  dueDate: string;
  amount?: number | null;
  skipped?: boolean;
  transactionId?: string | null;
  openAmount?: number | null;
}): Promise<PeriodWriteResult> {
  if (!(await exists('schedules', scheduleId))) {
    return { error: `schedule "${scheduleId}" does not exist` };
  }
  if (!isValidDay(dueDate)) {
    return { error: `due date "${String(dueDate)}" is not a valid date` };
  }
  if (amount !== undefined && amount !== null && !isAmount(amount)) {
    return { error: 'amount must be a whole number that is not negative' };
  }
  if (
    openAmount !== undefined &&
    openAmount !== null &&
    !isAmount(openAmount)
  ) {
    return {
      error: 'still expected must be a whole number that is not negative',
    };
  }
  const id = `${scheduleId}:${dueDate}`;
  const overrides = await readTable<PeriodChargeOverrideRow>(
    'period_charge_overrides',
  );
  const isLive = overrides.some(o => o.id === id && !o.tombstone);
  const fields: Record<string, FieldValue> = isLive
    ? {}
    : { amount: null, skipped: false, transaction_id: null, open_amount: null };
  if (amount !== undefined) {
    fields.amount = amount;
  }
  if (skipped !== undefined) {
    fields.skipped = skipped;
  }
  if (transactionId !== undefined) {
    fields.transaction_id = transactionId;
  }
  if (openAmount !== undefined) {
    fields.open_amount = openAmount;
  }
  await writeRow('period_charge_overrides', id, fields);
  return { id };
}

async function clearChargeOverride({
  id,
}: {
  id: string;
}): Promise<PeriodWriteResult> {
  const overrides = await readTable<PeriodChargeOverrideRow>(
    'period_charge_overrides',
  );
  const row = overrides.find(o => o.id === id && !o.tombstone);
  if (row === undefined) {
    return { error: `charge override "${id}" does not exist` };
  }
  await db.delete_('period_charge_overrides', id);
  return { id };
}

async function setAccountExcluded(
  accountId: string,
  excluded: boolean,
): Promise<PeriodWriteResult> {
  if (!(await exists('accounts', accountId))) {
    return { error: `account "${accountId}" does not exist` };
  }
  await writeRow('period_accounts', accountId, { excluded });
  return { id: accountId };
}

async function excludeAccount({
  accountId,
}: {
  accountId: string;
}): Promise<PeriodWriteResult> {
  return setAccountExcluded(accountId, true);
}

async function includeAccount({
  accountId,
}: {
  accountId: string;
}): Promise<PeriodWriteResult> {
  return setAccountExcluded(accountId, false);
}
