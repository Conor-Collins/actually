import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { send, sendCatch } from '@actual-app/core/platform/client/connection';
import {
  currentDay,
  format as formatDate,
} from '@actual-app/core/shared/months';
import { groupById } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { FinancialText } from '#components/FinancialText';
import { Checkbox } from '#components/forms';
import { useAccounts } from '#hooks/useAccounts';
import { useCategoriesById } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { usePayeesById } from '#hooks/usePayees';

async function preview(request: ScheduleCleanupRequest) {
  return send('schedule/preview-cleanup', request);
}

type CleanupPlan = Awaited<ReturnType<typeof preview>>;

export type ScheduleCleanupRequest = NonNullable<
  Parameters<typeof send<'schedule/preview-cleanup'>>[1]
>;

export function ScheduleCleanupModal({
  id,
  year = currentDay().slice(0, 4),
  transactionIds,
  isReopened = false,
}: Omit<ScheduleCleanupRequest, 'year'> & {
  year?: string;
  isReopened?: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState(year);
  const request = {
    id,
    year: selectedYear,
    transactionIds: isReopened ? undefined : transactionIds,
  };

  return (
    <Modal name="schedule-cleanup">
      {({ state }) => (
        <ScheduleCleanup
          key={selectedYear}
          request={request}
          close={() => state.close()}
          onYearChange={isReopened ? setSelectedYear : undefined}
        />
      )}
    </Modal>
  );
}

export function ScheduleCleanup({
  request,
  close,
  onYearChange,
}: {
  request: ScheduleCleanupRequest;
  close: () => void;
  onYearChange?: (year: string) => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [expanded, setExpanded] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const accountsById = groupById(accounts);
  const { data: payees } = usePayeesById();
  const { data: categories } = useCategoriesById();
  const [plan, setPlan] = useState<CleanupPlan>();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState({
    amounts: false,
    replacements: false,
    links: !onYearChange,
    moves: false,
  });

  const { id, year, transactionIds } = request;
  useEffect(() => {
    let current = true;
    void preview({
      id,
      year,
      ...(transactionIds ? { transactionIds } : {}),
    }).then(
      result => {
        if (current) {
          setPlan(result);
        }
      },
      () => {
        if (current) {
          setError(t('Could not load schedule cleanup.'));
        }
      },
    );
    return () => {
      current = false;
    };
  }, [id, year, transactionIds, t]);

  function displayAmount(amount: number) {
    return (
      <>
        {amount < 0 ? t('Payment') : t('Deposit')}{' '}
        <FinancialText
          style={amount < 0 ? undefined : { color: theme.noticeTextLight }}
        >
          {format(Math.abs(amount), 'financial')}
        </FinancialText>
      </>
    );
  }

  function transactionRows(transactions: TransactionEntity[]) {
    return transactions.map(transaction => (
      <li key={transaction.id}>
        {formatDate(transaction.date, dateFormat)} ·{' '}
        {payees?.[transaction.payee ?? '']?.name ?? t('No payee')}
        {' · '}
        {categories?.list[transaction.category ?? '']?.name ??
          t('Uncategorized')}
        {' · '}
        {accountsById[transaction.account]?.name ?? transaction.account}
        {' · '}
        {displayAmount(transaction.amount)}
      </li>
    ));
  }

  const actions = (
    ['amounts', 'replacements', 'links', 'moves'] as const
  ).filter(action => selected[action] && plan && plan[action].length > 0);

  async function onConfirm() {
    if (!plan || pending || actions.length === 0) {
      return;
    }
    setError('');
    setPending(true);
    try {
      const result = await sendCatch('schedule/apply-cleanup', {
        request,
        plan,
        actions,
      });
      if (result.error) {
        setError(t('Could not apply schedule cleanup.'));
        return;
      }
      if (result.data.changed) {
        setPlan(await preview(request));
        setSelected({
          amounts: false,
          replacements: false,
          links: false,
          moves: false,
        });
        setError(t('The budget changed. Review the updated cleanup options.'));
        return;
      }
      close();
    } catch {
      setError(t('Could not load schedule cleanup.'));
    } finally {
      setPending(false);
    }
  }

  const category =
    plan?.category && (categories?.list[plan.category]?.name ?? plan.category);
  const empty =
    plan &&
    !plan.amounts.length &&
    !plan.replacements.length &&
    !plan.links.length &&
    !plan.moves.length;
  const firstMonth = plan?.amounts[0];
  const lastMonth = plan?.amounts.at(-1);
  const uniform =
    plan &&
    plan.amounts.length > 1 &&
    firstMonth &&
    lastMonth &&
    plan.amounts.every(({ amount }) => amount === firstMonth.amount);
  const yearNumber = Number(year);

  return (
    <>
      <ModalHeader
        title={t('Schedule cleanup')}
        rightContent={empty ? undefined : <ModalCloseButton onPress={close} />}
      />
      {onYearChange && (
        <SpaceBetween
          gap={8}
          style={{ alignItems: 'center', marginBottom: 12 }}
        >
          <Button
            aria-label={t('Previous year')}
            isDisabled={pending || yearNumber <= 1}
            onPress={() =>
              onYearChange(String(yearNumber - 1).padStart(4, '0'))
            }
          >
            <SvgCheveronLeft width={14} height={14} />
          </Button>
          <span aria-live="polite">{year}</span>
          <Button
            aria-label={t('Next year')}
            isDisabled={pending || yearNumber >= 9998}
            onPress={() =>
              onYearChange(String(yearNumber + 1).padStart(4, '0'))
            }
          >
            <SvgCheveronRight width={14} height={14} />
          </Button>
        </SpaceBetween>
      )}
      {empty && (
        <p>
          <Trans>Nothing left to clean up for {{ year }}.</Trans>
        </p>
      )}
      {plan && !empty && (
        <div
          style={{
            overflowY: 'auto',
            maxHeight: '55vh',
            display: 'grid',
            gap: 12,
          }}
        >
          {(
            [
              {
                action: 'amounts',
                label: t(
                  'Clear {{count}} monthly budget amounts for {{category}}',
                  { count: plan.amounts.length, category },
                ),
                details: plan.amounts.map(({ month, amount }) => (
                  <li key={month}>
                    {formatDate(month + '-01', 'MMM yyyy')} ·{' '}
                    {displayAmount(amount)}
                  </li>
                )),
              },
              {
                action: 'replacements',
                label: t('Delete {{count}} old schedules', {
                  count: plan.replacements.length,
                }),
                details: plan.replacements.map(({ id, name, payee }) => (
                  <li key={id}>{name || payees?.[payee]?.name || id}</li>
                )),
              },
              {
                action: 'links',
                label: t('Link {{count}} transactions to this schedule', {
                  count: plan.links.length,
                }),
                details: transactionRows(plan.links),
              },
              {
                action: 'moves',
                label: t('Move {{count}} transactions to {{category}}', {
                  count: plan.moves.length,
                  category,
                }),
                details: transactionRows(plan.moves),
              },
            ] as const
          )
            .filter(({ details }) => details.length > 0)
            .map(({ action, label, details }) => (
              <div key={action}>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Checkbox
                    style={{ flexShrink: 0, margin: 0 }}
                    checked={selected[action]}
                    disabled={pending}
                    onChange={event =>
                      setSelected({
                        ...selected,
                        [action]: event.target.checked,
                      })
                    }
                  />
                  {label}
                </label>
                {action === 'amounts' && uniform && firstMonth && lastMonth ? (
                  <>
                    <Button
                      variant="bare"
                      aria-expanded={expanded}
                      onPress={() => setExpanded(!expanded)}
                    >
                      <Trans
                        i18nKey="{{start}} to {{end}} · <monthly>{{amount}}</monthly> per month · {{count}} months · <total>{{sum}}</total> total"
                        components={{
                          monthly: <FinancialText />,
                          total: <FinancialText />,
                        }}
                        count={plan.amounts.length}
                        values={{
                          start: formatDate(
                            firstMonth.month + '-01',
                            'MMM yyyy',
                          ),
                          end: formatDate(lastMonth.month + '-01', 'MMM yyyy'),
                          amount: format(
                            Math.abs(firstMonth.amount),
                            'financial',
                          ),
                          sum: format(
                            Math.abs(firstMonth.amount * plan.amounts.length),
                            'financial',
                          ),
                        }}
                      />
                    </Button>
                    {expanded && <ul>{details}</ul>}
                  </>
                ) : (
                  <ul>{details}</ul>
                )}
              </div>
            ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <SpaceBetween style={{ justifyContent: 'flex-end', marginTop: 20 }}>
        <Button onPress={close} isDisabled={pending}>
          {empty || onYearChange ? t('Close') : t('Skip cleanup')}
        </Button>
        {plan && !empty && (
          <Button
            variant="primary"
            onPress={onConfirm}
            isDisabled={pending || actions.length === 0}
          >
            <Trans>Apply cleanup</Trans>
          </Button>
        )}
      </SpaceBetween>
    </>
  );
}
