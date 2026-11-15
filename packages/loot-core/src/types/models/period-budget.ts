// Rows of the period budget tables, as the query layer returns them.
// Fields other than `id` can be null: sync applies one field at a time.

export type PeriodCadenceRow = {
  id: string; // the category's id
  anchor_date: string | null; // YYYY-MM-DD
  months: number | null;
  active: boolean;
  tombstone: boolean;
};

export type PeriodBudgetRow = {
  id: string; // <category id>:<start date>, never changed afterwards
  category: string | null;
  start_date: string | null; // YYYY-MM-DD, first day
  end_date: string | null; // YYYY-MM-DD, first day after the period
  budget: number | null;
  carryover: number | null;
  carried_from: string | null;
  tombstone: boolean;
};

export type PeriodOffsetRow = {
  id: string; // the transaction's id
  period_id: string | null;
  tombstone: boolean;
};

export type PeriodScheduleLinkRow = {
  id: string; // the schedule's id
  category: string | null;
  tombstone: boolean;
};

export type PeriodChargeOverrideRow = {
  id: string; // <schedule id>:<due date>
  amount: number | null;
  skipped: boolean;
  transaction_id: string | null;
  open_amount: number | null;
  tombstone: boolean;
};

export type PeriodAccountRow = {
  id: string; // the account's id
  excluded: boolean;
  tombstone: boolean;
};

export type PeriodBudgetRows = {
  cadences: PeriodCadenceRow[];
  periods: PeriodBudgetRow[];
  offsets: PeriodOffsetRow[];
  scheduleLinks: PeriodScheduleLinkRow[];
  chargeOverrides: PeriodChargeOverrideRow[];
  accounts: PeriodAccountRow[];
};
