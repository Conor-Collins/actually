// @ts-strict-ignore
import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { send, sendCatch } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { isCleanupEligibleSchedule } from '@actual-app/core/shared/schedules';
import type {
  RecurConfig,
  ScheduleEntity,
} from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { usePayeesById } from '#hooks/usePayees';
import { useScheduleEdit } from '#hooks/useScheduleEdit';
import { useSelected } from '#hooks/useSelected';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { aqlQuery } from '#queries/aqlQuery';
import { useDispatch } from '#redux';

import { updateScheduleConditions } from './schedule-edit-utils';
import { ScheduleCleanup } from './ScheduleCleanup';
import type { ScheduleCleanupRequest } from './ScheduleCleanup';
import { ScheduleEditForm } from './ScheduleEditForm';

type ScheduleEditModalProps = Extract<
  ModalType,
  { name: 'schedule-edit' }
>['options'];

export function ScheduleEditModal({
  id,
  transaction,
  filtered,
}: ScheduleEditModalProps) {
  const { t } = useTranslation();

  const adding = id == null;
  const fromTrans = transaction != null;
  const { data: payees } = usePayeesById();
  const globalDispatch = useDispatch();
  const [cleanup, setCleanup] = useState<ScheduleCleanupRequest>();
  const [saving, setSaving] = useState(false);

  // Create initial schedule if adding from transaction
  const initialSchedule = useMemo(() => {
    if (!adding) {
      return undefined;
    }

    if (filtered) {
      return filtered.schedule;
    }

    const date = {
      start: monthUtils.currentDay(),
      frequency: 'monthly',
      patterns: [],
      skipWeekend: false,
      weekendSolveMode: 'after',
      endMode: 'never',
      endOccurrences: 1,
      endDate: monthUtils.currentDay(),
    } satisfies RecurConfig;

    const transFields = fromTrans
      ? ({
          _account: transaction.account,
          _amount: transaction.amount,
          _amountOp: 'is',
          name: transaction.payee ? payees[transaction.payee].name : '',
          _payee: transaction.payee ? transaction.payee : '',
          _date: {
            ...date,
            frequency: 'monthly',
            start: transaction.date,
            patterns: [],
          },
        } satisfies Partial<ScheduleEntity>)
      : {};

    return {
      posts_transaction: false,
      _date: date,
      _conditions: [{ op: 'isapprox', field: 'date', value: date }],
      _actions: [],
      ...transFields,
    } satisfies Partial<ScheduleEntity>;
  }, [adding, filtered, fromTrans, payees, transaction]);

  const { state, dispatch, loadSchedule } = useScheduleEdit({
    scheduleId: id,
    adding,
    initialSchedule,
    transactionId: transaction?.id,
    filteredTransactions: filtered?.transactions,
  });

  const selectedInst = useSelected(
    'transactions',
    state.transactions,
    filtered
      ? filtered.transactions
          .filter(transaction => !transaction.schedule)
          .map(transaction => transaction.id)
      : transaction
        ? [transaction.id]
        : [],
  );

  async function onSave(close: () => void) {
    dispatch({ type: 'form-error', error: null });
    if (!state.schedule || saving) {
      return;
    }

    if (state.fields.name) {
      const { data: sameName } = await aqlQuery(
        q('schedules').filter({ name: state.fields.name }).select('id'),
      );
      if (sameName.length > 0 && sameName[0].id !== state.schedule.id) {
        dispatch({
          type: 'form-error',
          error: t('There is already a schedule with this name'),
        });
        return;
      }
    }

    const { error, conditions } = updateScheduleConditions(
      state.schedule,
      state.fields,
    );

    if (error) {
      dispatch({ type: 'form-error', error });
      return;
    }

    const schedule = {
      id: state.schedule.id,
      posts_transaction: state.fields.posts_transaction,
      custom_upcoming_length: state.fields.custom_upcoming_length,
      name: state.fields.name,
    };
    if (filtered) {
      if (
        state.fields.category !== filtered.category ||
        typeof state.fields.date !== 'object' ||
        state.fields.date?.frequency !== 'yearly'
      ) {
        dispatch({
          type: 'form-error',
          error: t(
            'Keep the filtered category and yearly repeat to create a yearly period.',
          ),
        });
        return;
      }
      const transactionIds = [...selectedInst.items];
      setSaving(true);
      try {
        const result = await send('schedule/create-from-filter', {
          schedule,
          conditions,
          year: filtered.year,
        });
        if (result.conflict) {
          dispatch({
            type: 'form-error',
            error: t(
              'Could not set the {{year}} allowance because a budget period already runs from {{start}} through {{lastDay}}.',
              {
                year: filtered.year,
                start: result.conflict.start,
                lastDay: monthUtils.subDays(result.conflict.end, 1),
              },
            ),
          });
          return;
        }
        setCleanup({ id: result.id, year: filtered.year, transactionIds });
      } catch {
        dispatch({
          type: 'form-error',
          error: t('Could not save the schedule and yearly period.'),
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    const res = await sendCatch(
      adding ? 'schedule/create' : 'schedule/update',
      { schedule, conditions, replaceOptionalConditions: true },
    );

    if (res.error) {
      dispatch({
        type: 'form-error',
        error: t(
          'An error occurred while saving. Please visit https://actualbudget.org/contact/ for support.',
        ),
      });
      return;
    }

    if (adding) {
      await onLinkTransactions([...selectedInst.items], res.data);
    }

    close();
  }

  async function onEditRule(id: string) {
    const rule = await send('rule-get', { id });

    if (!rule) {
      return;
    }

    globalDispatch(
      pushModal({
        modal: {
          name: 'edit-rule',
          options: {
            rule,
            onSave: async () => {
              const schedule = await loadSchedule();
              if (schedule) {
                throw new Error('Schedule found');
              }

              dispatch({ type: 'set-schedule', schedule });
            },
          },
        },
      }),
    );
  }

  async function onLinkTransactions(ids: string[], scheduleId?: string) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({
        id,
        schedule: scheduleId,
      })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  async function onUnlinkTransactions(ids: string[]) {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null })),
    });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const { schedule } = state;

  if (schedule == null) {
    return null;
  }

  function onSwitchTransactions(mode: 'linked' | 'matched') {
    dispatch({ type: 'switch-transactions', mode });
    selectedInst.dispatch({ type: 'select-none' });
  }

  const payee =
    payees && state.fields.payees.length === 1
      ? payees[state.fields.payees[0]]
      : null;
  // This is derived from the date
  const repeats =
    state.fields.date && typeof state.fields.date !== 'string'
      ? !!state.fields.date.frequency
      : false;
  return (
    <Modal name="schedule-edit">
      {({ state: modalState }) =>
        cleanup ? (
          <ScheduleCleanup request={cleanup} close={() => modalState.close()} />
        ) : (
          <>
            <ModalHeader
              title={
                payee
                  ? t(`Schedule: {{name}}`, { name: payee.name })
                  : t('Schedule')
              }
              rightContent={
                <ModalCloseButton onPress={() => modalState.close()} />
              }
            />
            <ScheduleEditForm
              fields={state.fields}
              dispatch={dispatch}
              upcomingDates={state.upcomingDates}
              repeats={repeats}
              schedule={schedule}
              adding={adding}
              fromFilter={!!filtered}
              isCustom={state.isCustom ?? false}
              onEditRule={onEditRule}
              transactions={state.transactions}
              transactionsMode={state.transactionsMode}
              error={filtered ? null : state.error}
              selectedInst={selectedInst}
              onSwitchTransactions={onSwitchTransactions}
              onLinkTransactions={onLinkTransactions}
              onUnlinkTransactions={onUnlinkTransactions}
            />

            {filtered && state.error && <p role="alert">{state.error}</p>}
            {filtered && (
              <p>
                <Trans>
                  Adding this schedule also sets the allowance for{' '}
                  {{ year: filtered.year }}. You can review cleanup next.
                </Trans>
              </p>
            )}
            <SpaceBetween
              style={{
                marginTop: 20,
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              {id &&
                !adding &&
                schedule &&
                isCleanupEligibleSchedule(schedule) && (
                  <Button
                    onPress={() =>
                      globalDispatch(
                        pushModal({
                          modal: {
                            name: 'schedule-cleanup',
                            options: { id, isReopened: true },
                          },
                        }),
                      )
                    }
                  >
                    <Trans>Clean up…</Trans>
                  </Button>
                )}
              <Button isDisabled={saving} onPress={() => modalState.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                isDisabled={saving}
                onPress={() => onSave(() => modalState.close())}
              >
                {adding ? t('Add') : t('Save')}
              </Button>
            </SpaceBetween>
          </>
        )
      }
    </Modal>
  );
}
