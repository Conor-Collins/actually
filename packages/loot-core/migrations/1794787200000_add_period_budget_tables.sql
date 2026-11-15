BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS period_cadences
  (id TEXT PRIMARY KEY,
   anchor_date INTEGER,
   months INTEGER,
   active INTEGER DEFAULT 1,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS period_budgets
  (id TEXT PRIMARY KEY,
   category TEXT,
   start_date INTEGER,
   end_date INTEGER,
   budget INTEGER DEFAULT 0,
   carryover INTEGER DEFAULT 0,
   carried_from TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS period_offsets
  (id TEXT PRIMARY KEY,
   period_id TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS period_schedule_links
  (id TEXT PRIMARY KEY,
   category TEXT,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS period_charge_overrides
  (id TEXT PRIMARY KEY,
   amount INTEGER,
   skipped INTEGER DEFAULT 0,
   transaction_id TEXT,
   open_amount INTEGER,
   tombstone INTEGER DEFAULT 0);

CREATE TABLE IF NOT EXISTS period_accounts
  (id TEXT PRIMARY KEY,
   excluded INTEGER DEFAULT 0,
   tombstone INTEGER DEFAULT 0);

COMMIT;
