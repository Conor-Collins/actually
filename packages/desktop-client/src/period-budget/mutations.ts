import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import type { Handlers } from '@actual-app/core/types/handlers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';

import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import type { PeriodView } from './model';
import { periodBudgetQueries } from './queries';

type WriteName =
  | 'period-budget/set-cadence'
  | 'period-budget/stop-cadence'
  | 'period-budget/create-period'
  | 'period-budget/update-period'
  | 'period-budget/delete-period'
  | 'period-budget/restore-period'
  | 'period-budget/carry'
  | 'period-budget/set-offset'
  | 'period-budget/clear-offset'
  | 'period-budget/link-schedule'
  | 'period-budget/unlink-schedule'
  | 'period-budget/set-charge-override'
  | 'period-budget/clear-charge-override'
  | 'period-budget/exclude-account'
  | 'period-budget/include-account';

export type PeriodBudgetWrite = {
  [Name in WriteName]: { name: Name; args: Parameters<Handlers[Name]>[0] };
}[WriteName];

// One write, or a write that needs the id the write before it returned (the
// id of a period that was planned and is now stored).
export type PeriodBudgetWriteStep =
  | PeriodBudgetWrite
  | ((previousId: string) => PeriodBudgetWrite);

// The writes for an action on a period. A period that only follows from the
// cadence is stored first, and the action then gets the id it was stored with.
export function onStoredPeriod(
  view: PeriodView,
  write: (id: string) => PeriodBudgetWrite,
): PeriodBudgetWriteStep[] {
  if (!view.isPlanned) {
    return [write(view.period.id)];
  }
  const { category, start, end, budget } = view.period;
  return [
    {
      name: 'period-budget/create-period',
      args: { category, start, end, budget },
    },
    write,
  ];
}

// Runs the writes in order and stops at the first one the server refuses.
// `onWritten` gets the id the last write returned, before the page is
// calculated again and also when the caller is gone from the page by then; it
// is for what has to follow the write, such as which row is open. What only
// tidies the caller up, such as closing its form, goes in `mutate`'s
// `onSuccess`, which runs once the page shows the change.
export function usePeriodBudgetMutation(onWritten?: (id: string) => void) {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (steps: PeriodBudgetWriteStep[]) => {
      let id = '';
      for (const step of steps) {
        const write = typeof step === 'function' ? step(id) : step;
        const result = await send(write.name, write.args);
        if ('error' in result) {
          throw new Error(result.error);
        }
        id = result.id;
      }
      return id;
    },
    onSuccess: id => onWritten?.(id),
    // Also after a refusal: the writes before it were saved
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: periodBudgetQueries.all() }),
    onError: error => {
      dispatch(
        addNotification({
          notification: {
            id: uuidv4(),
            type: 'error',
            message: t('The change to the period budget was not saved.'),
            pre: error.message,
          },
        }),
      );
    },
  });
}
