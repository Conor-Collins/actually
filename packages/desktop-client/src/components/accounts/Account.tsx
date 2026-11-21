import React, {
  createRef,
  PureComponent,
  startTransition,
  useEffect,
  useMemo,
} from 'react';
import type { ReactElement, RefObject } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans } from 'react-i18next';
import { Navigate, useLocation, useParams } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
import type { UndoState } from '@actual-app/core/server/undo';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import {
  makeAsNonChildTransactions,
  makeChild,
  ungroupTransaction,
  ungroupTransactions,
} from '@actual-app/core/shared/transactions';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryGroupEntity,
  NewRuleEntity,
  PayeeEntity,
  RuleActionEntity,
  RuleConditionEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';
import { debounce, isEqual } from 'es-toolkit/compat';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import {
  useReopenAccountMutation,
  useSyncAndDownloadMutation,
  useUnlinkAccountMutation,
  useUpdateAccountMutation,
} from '#accounts';
import { markAccountRead } from '#accounts/accountsSlice';
import * as reconciliation from '#accounts/reconciliation';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import type { SavedFilter } from '#components/filters/SavedFilterMenuButton';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from '#components/transactions/table/columns';
import { TransactionList } from '#components/transactions/TransactionList';
import {
  getTransactionTotals,
  updateTransactionTotals,
} from '#components/transactions/TransactionTotals';
import type { TransactionTotals } from '#components/transactions/TransactionTotals';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccountPreviewTransactions } from '#hooks/useAccountPreviewTransactions';
import { useAccounts } from '#hooks/useAccounts';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLocalPref } from '#hooks/useLocalPref';
import { usePayees } from '#hooks/usePayees';
import { getSchedulesQuery } from '#hooks/useSchedules';
import { SelectedProviderWithItems } from '#hooks/useSelected';
import type { Actions } from '#hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '#hooks/useSplitsExpanded';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactionBatchActions } from '#hooks/useTransactionBatchActions';
import { useTransactionFilters } from '#hooks/useTransactionFilters';
import { calculateRunningBalancesBottomUp } from '#hooks/useTransactions';
import {
  SPECIAL_VIEW_IDS,
  useTransactionTableColumns,
} from '#hooks/useTransactionTableColumns';
import {
  openAccountCloseModal,
  pushModal,
  replaceModal,
} from '#modals/modalsSlice';
import type { ConfirmTransactionEditReason } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useCreatePayeeMutation } from '#payees';
import * as queries from '#queries';
import { aqlQuery } from '#queries/aqlQuery';
import { pagedQuery } from '#queries/pagedQuery';
import type { PagedQuery } from '#queries/pagedQuery';
import { useDispatch, useSelector } from '#redux';
import type { AppDispatch } from '#redux/store';
import { updateNewTransactions } from '#transactions/transactionsSlice';

import {
  accountDateQueries,
  addDateCondition,
  describeDateFilters,
  initialAccountFilters,
  isDateFilter,
} from './account-date-filters';
import type { AccountFilter as ConditionEntity } from './account-date-filters';
import { AccountEmptyMessage } from './AccountEmptyMessage';
import { AccountHeader } from './Header';

function isTransactionFilterEntity(
  filter: ConditionEntity,
): filter is TransactionFilterEntity {
  return 'id' in filter;
}

type AllTransactionsProps = {
  account?: AccountEntity | undefined;
  transactions: TransactionEntity[];
  balances: Record<TransactionEntity['id'], IntegerAmount> | null;
  showBalances?: boolean | undefined;
  showPreviews: boolean;
  rangeConditions: RuleConditionEntity[];
  children: (
    transactions: TransactionEntity[],
    balances: Record<TransactionEntity['id'], IntegerAmount> | null,
  ) => ReactElement;
};

function AllTransactions({
  account,
  transactions,
  balances,
  showBalances,
  showPreviews,
  rangeConditions,
  children,
}: AllTransactionsProps) {
  const accountId = account?.id;
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    useAccountPreviewTransactions({ accountId });

  useEffect(() => {
    if (!isPreviewTransactionsLoading) {
      splitsExpandedDispatch({
        type: 'close-splits',
        ids: previewTransactions.filter(t => t.is_parent).map(t => t.id),
      });
    }
  }, [
    isPreviewTransactionsLoading,
    previewTransactions,
    splitsExpandedDispatch,
  ]);

  const { start, end, empty } = describeDateFilters(rangeConditions) ?? {};
  const visiblePreviews =
    showPreviews && !empty
      ? previewTransactions.filter(
          ({ date }) => (!start || date >= start) && (!end || date <= end),
        )
      : [];
  const prependBalances = useMemo(() => {
    if (!showBalances || !showPreviews || !balances) return null;
    return Object.fromEntries(
      calculateRunningBalancesBottomUp(
        previewTransactions,
        'all',
        Object.values(balances)[0] ?? 0,
      ),
    );
  }, [showBalances, showPreviews, previewTransactions, balances]);

  return children(
    visiblePreviews.length
      ? visiblePreviews.concat(transactions)
      : transactions,
    prependBalances ? { ...prependBalances, ...balances } : balances,
  );
}

function getField(field?: string) {
  if (!field) {
    return 'date';
  }

  switch (field) {
    case 'account':
      return 'account.name';
    case 'payee':
      return 'payee.name';
    case 'category':
      return 'category.name';
    case 'payment':
      return 'amount';
    case 'deposit':
      return 'amount';
    default:
      return field;
  }
}

type AccountInternalProps = {
  accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
    | 'uncategorized'
    | undefined;
  filterConditions: RuleConditionEntity[];
  showBalances?: boolean;
  showNetWorthChart: boolean;
  setShowNetWorthChart: (newValue: boolean) => void;
  showCleared?: boolean;
  showReconciled: boolean;
  setShowReconciled: (newValue: boolean) => void;
  showGroup: boolean;
  showExtraBalances?: boolean;
  setShowExtraBalances: (newValue: boolean) => void;
  transactionColumns: TransactionTableColumn[];
  columnOrder: TransactionTableColumnId[];
  saveColumns: (columns: TransactionTableColumn[], applyToAll: boolean) => void;
  modalShowing?: boolean;
  accounts: AccountEntity[];
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  splitsExpandedDispatch: ReturnType<typeof useSplitsExpanded>['dispatch'];
  expandSplits?: boolean | undefined;
  savedFilters: TransactionFilterEntity[];
  onBatchEdit: ReturnType<typeof useTransactionBatchActions>['onBatchEdit'];
  onBatchDuplicate: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchDuplicate'];
  onBatchLinkSchedule: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchLinkSchedule'];
  onBatchUnlinkSchedule: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchUnlinkSchedule'];
  onBatchDelete: ReturnType<typeof useTransactionBatchActions>['onBatchDelete'];
  categoryId?: string;
  location: ReturnType<typeof useLocation>;
  dateFormat: ReturnType<typeof useDateFormat>;
  payees: PayeeEntity[];
  categoryGroups: CategoryGroupEntity[];
  hideFraction: boolean;
  accountsSyncing: string[];
  dispatch: AppDispatch;
  onSetTransfer: ReturnType<typeof useTransactionBatchActions>['onSetTransfer'];
  onReopenAccount: (id: AccountEntity['id']) => void;
  onUpdateAccount: (account: AccountEntity) => void;
  onUnlinkAccount: (id: AccountEntity['id']) => void;
  onSyncAndDownload: (accountId?: AccountEntity['id']) => void;
  onCreatePayee: (name: PayeeEntity['name']) => Promise<PayeeEntity['id']>;
};

type AccountInternalState = {
  search: string;
  filterConditions: ConditionEntity[];
  rangeConditions: RuleConditionEntity[];
  filterId?: SavedFilter | undefined;
  filterConditionsOp: 'and' | 'or';
  loading: boolean;
  workingHard: boolean;
  reconcileAmount: null | number;
  transactions: TransactionEntity[];
  transactionsFiltered?: boolean;
  showBalances?: boolean | undefined;
  balances: Record<TransactionEntity['id'], IntegerAmount> | null;
  showCleared?: boolean | undefined;
  prevShowCleared?: boolean | undefined;
  showReconciled: boolean;
  nameError: string;
  isAdding: boolean;
  modalShowing?: boolean;
  sort: {
    ascDesc: 'asc' | 'desc';
    field: string;
    prevField?: string | undefined;
    prevAscDesc?: 'asc' | 'desc' | undefined;
  } | null;
  totals: TransactionTotals | null;
  dateFreeQuery: Query | null;
};

export type TableRef = RefObject<{
  edit: (updatedId: string | null, op?: string, someBool?: boolean) => void;
  setRowAnimation: (animation: boolean) => void;
  scrollTo: (focusId: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => string;
} | null>;

class AccountInternal extends PureComponent<
  AccountInternalProps,
  AccountInternalState
> {
  paged: PagedQuery<TransactionEntity> | null;
  rootQuery!: Query;
  currentQuery: Query | null = null;
  filterRevision = 0;
  table: TableRef;
  unlisten?: () => void;
  dispatchSelected?: (action: Actions) => void;
  _isOptimisticUpdate: boolean = false;

  constructor(props: AccountInternalProps) {
    super(props);
    this.paged = null;
    this.table = createRef();

    this.state = {
      search: '',
      ...initialAccountFilters(
        props.accountId,
        props.filterConditions,
        !!props.location.state?.goBack,
      ),
      filterId: undefined,
      filterConditionsOp: 'and',
      loading: true,
      workingHard: false,
      reconcileAmount: null,
      transactions: [],
      showBalances: props.showBalances,
      balances: null,
      showCleared: props.showCleared,
      showReconciled: props.showReconciled,
      nameError: '',
      isAdding: false,
      sort: null,
      totals: null,
      dateFreeQuery: null,
    };
  }

  async componentDidMount() {
    const maybeRefetch = (tables: string[]) => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        return this.refetchTransactions();
      }
    };

    const onUndo = async ({ tables, messages }: UndoState) => {
      await maybeRefetch(tables);

      // If all the messages are dealing with transactions, find the
      // first message referencing a non-deleted row so that we can
      // highlight the row
      //
      let focusId: null | string = null;
      if (
        messages.every(msg => msg.dataset === 'transactions') &&
        !messages.find(msg => msg.column === 'tombstone')
      ) {
        const focusableMsgs = messages.filter(
          msg =>
            msg.dataset === 'transactions' && !(msg.column === 'tombstone'),
        );

        focusId = focusableMsgs.length === 1 ? focusableMsgs[0].row : null;

        // Highlight the transactions
        // this.table && this.table.highlight(focusableMsgs.map(msg => msg.row));
      }

      if (this.table.current) {
        this.table.current.edit(null);

        // Focus a transaction if applicable. There is a chance if the
        // user navigated away that focusId is a transaction that has
        // been "paged off" and we won't focus it. That's ok, we just
        // do our best.
        if (focusId) {
          this.table.current.scrollTo(focusId);
        }
      }

      undo.setUndoState('undoEvent', null);
    };

    const unlistens = [listen('undo-event', onUndo)];

    this.unlisten = () => {
      unlistens.forEach(unlisten => unlisten());
    };

    // Important that any async work happens last so that the
    // listeners are set up synchronously
    this.fetchTransactions(this.state.filterConditions);

    // If there is a pending undo, apply it immediately (this happens
    // when an undo changes the location to this page)
    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      void onUndo(lastUndoEvent);
    }
  }

  componentDidUpdate(prevProps: AccountInternalProps) {
    // If the active account changes - close the transaction entry mode
    if (this.state.isAdding && this.props.accountId !== prevProps.accountId) {
      this.setState({ isAdding: false });
    }

    // If the user was on a different screen and is now coming back to
    // the transactions, automatically refresh the transaction to make
    // sure we have updated state
    if (prevProps.modalShowing && !this.props.modalShowing) {
      // This is clearly a hack. Need a better way to track which
      // things are listening to transactions and refetch
      // automatically (use ActualQL?)
      setTimeout(() => {
        void this.refetchTransactions();
      }, 100);
    }

    if (
      this.props.accountId === prevProps.accountId &&
      this.props.location.key !== prevProps.location.key &&
      (this.props.location.state?.filterConditions ||
        prevProps.location.state?.filterConditions ||
        this.props.location.state?.goBack ||
        prevProps.location.state?.goBack)
    ) {
      const { filterConditions, rangeConditions } = initialAccountFilters(
        this.props.accountId,
        this.props.filterConditions,
        !!this.props.location.state?.goBack,
      );
      this.setState({ filterId: undefined, filterConditionsOp: 'and' });
      void this.applyFilters(filterConditions, 'and', rangeConditions);
    }
  }

  componentWillUnmount() {
    this.filterRevision++;
    this.onSearchDone.cancel();
    if (this.unlisten) {
      this.unlisten();
    }
    this.paged?.unsubscribe();
    this.paged = null;
  }

  fetchAllIds = async () => {
    if (!this.paged) {
      return [];
    }

    const { data } = await aqlQuery(this.paged.query.select('id'));
    // Remember, this is the `grouped` split type so we need to deal
    // with the `subtransactions` property
    return data.reduce((arr: string[], t: TransactionEntity) => {
      arr.push(t.id);
      t.subtransactions?.forEach(sub => arr.push(sub.id));
      return arr;
    }, []);
  };

  refetchTransactions = async () => {
    void this.paged?.run();
  };

  fetchTransactions = (filterConditions = this.state.filterConditions) => {
    this.rootQuery = this.makeRootTransactionsQuery();
    void this.applyFilters(filterConditions);

    if (this.props.accountId) {
      this.props.dispatch(markAccountRead({ id: this.props.accountId }));
    }
  };

  makeRootTransactionsQuery = () => {
    const accountId = this.props.accountId;

    return queries.transactions(accountId);
  };

  queryWithSearch(query: Query) {
    const { search } = this.state;
    return search
      ? queries.transactionsSearch(query, search, this.props.dateFormat)
      : query;
  }

  queryWithReconciledVisibility(query: Query) {
    return this.state.showReconciled
      ? query
      : query.filter({ reconciled: { $eq: false } });
  }

  refreshVisibleQuery = () => {
    if (!this.currentQuery) return;
    let query = this.currentQuery;
    const { sort } = this.state;
    if (sort) {
      const field = getField(sort.field);
      if (field === 'cleared') {
        query = query.orderBy({ reconciled: sort.ascDesc });
      }
      query = query.orderBy({ [field]: sort.ascDesc });
      if (sort.prevField) {
        const previous = getField(sort.prevField);
        if (previous === 'cleared') {
          query = query.orderBy({ reconciled: sort.prevAscDesc });
        }
        query = query.orderBy({ [previous]: sort.prevAscDesc });
      }
      query = query.orderBy({ sort_order: sort.ascDesc });
    }
    const isFiltered =
      this.state.search !== '' ||
      this.state.filterConditions.length > 0 ||
      (this.state.reconcileAmount == null &&
        this.state.rangeConditions.length > 0);
    this.updateQuery(this.queryWithSearch(query), isFiltered);
  };

  updateQuery(query: Query, isFiltered: boolean) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    // Filter out reconciled transactions if they are hidden
    // and we're not showing balances.
    if (
      !this.state.showReconciled &&
      (!this.state.showBalances || !this.canCalculateBalance())
    ) {
      query = this.queryWithReconciledVisibility(query);
    }

    const pageQuery = query.select('*');
    this._isOptimisticUpdate = false;
    this.paged = pagedQuery(pageQuery, {
      onData: async (groupedData, prevData) => {
        const data = ungroupTransactions([...groupedData]);
        const firstLoad = prevData == null;

        // Carry the edited page's delta into the unpaginated totals until
        // the database refresh re-applies filters to the committed edit.
        if (this._isOptimisticUpdate) {
          this._isOptimisticUpdate = false;
          const shown = (rows: readonly TransactionEntity[]) =>
            this.state.showReconciled
              ? rows
              : rows.filter(transaction => !transaction.reconciled);
          const previous = shown(prevData ?? []);
          const updated = shown(groupedData);
          startTransition(() => {
            this.setState(({ totals }) => ({
              transactions: data,
              totals:
                totals && updateTransactionTotals(totals, previous, updated),
            }));
          });
          return;
        }

        if (firstLoad) {
          this.table.current?.setRowAnimation(false);

          this.props.splitsExpandedDispatch({
            type: 'set-mode',
            mode:
              this.props.expandSplits && !this.hasNonDateFilters()
                ? 'expand'
                : 'collapse',
          });
        }

        const balances = this.state.showBalances
          ? await this.calculateBalances()
          : null;
        const totals = await getTransactionTotals(
          this.queryWithReconciledVisibility(query),
        );
        if (
          this.paged?.query !== pageQuery ||
          this.paged.data !== groupedData
        ) {
          return;
        }

        this.setState(
          {
            transactions: data,
            transactionsFiltered: isFiltered,
            loading: false,
            workingHard: false,
            balances,
            totals,
          },
          () => {
            if (firstLoad) {
              this.table.current?.scrollToTop();
            }

            setTimeout(() => {
              this.table.current?.setRowAnimation(true);
            }, 0);
          },
        );
      },
      options: {
        pageCount: 150,
        onlySync: true,
      },
    });
  }

  // oxlint-disable-next-line react/no-unsafe
  UNSAFE_componentWillReceiveProps(nextProps: AccountInternalProps) {
    if (this.props.accountId !== nextProps.accountId) {
      this.filterRevision++;
      this.onSearchDone.cancel();
      this.currentQuery = null;
      this.paged?.unsubscribe();
      this.paged = null;
      this.setState(
        {
          loading: true,
          search: '',
          sort: null,
          ...initialAccountFilters(
            nextProps.accountId,
            nextProps.filterConditions,
            !!nextProps.location.state?.goBack,
          ),
          filterConditionsOp: 'and',
          filterId: undefined,
          transactions: [],
          dateFreeQuery: null,
          totals: null,
          showBalances: nextProps.showBalances,
          balances: null,
          showCleared: nextProps.showCleared,
          showReconciled: nextProps.showReconciled,
          reconcileAmount: null,
        },
        () => {
          this.fetchTransactions();
        },
      );
    }
  }

  onSearch = (value: string) => {
    this.paged?.unsubscribe();
    this.setState({ search: value }, this.onSearchDone);
  };

  onSearchDone = debounce(this.refreshVisibleQuery, 150);

  onSync = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    this.props.onSyncAndDownload(account ? account.id : accountId);
  };

  onImport = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    if (account) {
      const res = await window.Actual.openFileDialog({
        filters: [
          {
            name: t('Financial files'),
            extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml'],
          },
        ],
      });

      if (res) {
        if (accountId && res?.length > 0) {
          this.props.dispatch(
            pushModal({
              modal: {
                name: 'import-transactions',
                options: {
                  accountId,
                  filename: res[0],
                  onImported: (didChange: boolean) => {
                    if (didChange) {
                      this.fetchTransactions();
                    }
                  },
                },
              },
            }),
          );
        }
      }
    }
  };

  onExport = async (accountName: string) => {
    const exportedTransactions = await send('transactions-export-query', {
      query: (
        this.currentQuery ?? this.makeRootTransactionsQuery()
      ).serialize(),
    });
    const normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    const filename = `${normalizedName || 'transactions'}.csv`;

    try {
      await window.Actual.saveFile(
        exportedTransactions,
        filename,
        t('Export transactions'),
      );
    } catch {
      this.props.dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to export transactions.'),
          },
        }),
      );
    }
  };

  onTransactionsChange = (updatedTransaction: TransactionEntity) => {
    // Apply changes to the current page before the database refresh.
    this._isOptimisticUpdate = this.paged !== null;
    this.paged?.optimisticUpdate(data => {
      if (updatedTransaction._deleted) {
        return data.filter(t => t.id !== updatedTransaction.id);
      } else {
        return data.map(t => {
          return t.id === updatedTransaction.id ? updatedTransaction : t;
        });
      }
    });

    this.props.dispatch(updateNewTransactions({ id: updatedTransaction.id }));
  };

  hasNonDateFilters = () =>
    this.state.search !== '' ||
    this.state.filterConditions.some(condition => !isDateFilter(condition));

  canCalculateBalance = () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );

    if (!account) return false;
    if (this.hasNonDateFilters()) return false;
    if (this.state.sort === null) {
      return true;
    } else {
      return (
        this.state.sort.field === 'date' && this.state.sort.ascDesc === 'desc'
      );
    }
  };

  async calculateBalances() {
    if (!this.canCalculateBalance() || !this.paged) {
      return null;
    }

    const { data }: { data: { id: string; balance: number }[] } =
      await aqlQuery(
        this.rootQuery
          .options({ splits: 'none' })
          .select([{ balance: { $sumOver: '$amount' } }]),
      );

    return data.reduce((balances: Record<string, number>, row) => {
      balances[row.id] = row.balance;
      return balances;
    }, {});
  }

  onRunRules = async (ids: string[]) => {
    try {
      this.setState({ workingHard: true });
      // Bulk fetch transactions
      const transactions = this.state.transactions.filter(trans =>
        ids.includes(trans.id),
      );
      const changedTransactions: TransactionEntity[] = [];
      const allErrors: string[] = [];

      for (const transaction of transactions) {
        const res: TransactionEntity | null = await send('rules-run', {
          transaction,
        });
        if (res) {
          changedTransactions.push(...ungroupTransaction(res));

          // Collect formula errors
          if (res._ruleErrors && res._ruleErrors.length > 0) {
            allErrors.push(...res._ruleErrors);
          }
        }
      }

      // Show errors if any
      if (allErrors.length > 0) {
        this.props.dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: `Formula errors in rules:\n${allErrors.join('\n')}`,
              sticky: true,
            },
          }),
        );
      }

      // If we have changed transactions, update them in the database
      if (changedTransactions.length > 0) {
        await send('transactions-batch-update', {
          updated: changedTransactions,
        });
      }

      // Fetch updated transactions once at the end
      this.fetchTransactions();
    } catch (error) {
      console.error('Error applying rules:', error);
      this.props.dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: 'Failed to apply rules to transactions',
          },
        }),
      );
    } finally {
      this.setState({ workingHard: false });
    }
  };

  onAddTransaction = () => {
    this.setState({ isAdding: true });
  };

  onSaveName = (name: string) => {
    const accountNameError = validateAccountName(
      name,
      this.props.accountId ?? '',
      this.props.accounts,
    );
    if (accountNameError) {
      this.setState({ nameError: accountNameError });
    } else {
      const account = this.props.accounts.find(
        account => account.id === this.props.accountId,
      );
      if (!account) {
        throw new Error(`Account with ID ${this.props.accountId} not found.`);
      }
      this.props.onUpdateAccount({ ...account, name });
      this.setState({ nameError: '' });
    }
  };

  onToggleExtraBalances = () => {
    this.props.setShowExtraBalances(!this.props.showExtraBalances);
  };

  onMenuSelect = async (
    item:
      | 'link'
      | 'unlink'
      | 'close'
      | 'reopen'
      | 'export'
      | 'remove-sorting'
      | 'toggle-reconciled'
      | 'toggle-net-worth-chart'
      | 'manage-columns'
      | 'account-group',
  ) => {
    const accountId = this.props.accountId!;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    )!;

    switch (item) {
      case 'link':
        this.props.dispatch(
          pushModal({
            modal: {
              name: 'add-account',
              options: {
                upgradingAccountId: accountId,
              },
            },
          }),
        );
        break;
      case 'unlink':
        this.props.dispatch(
          pushModal({
            modal: {
              name: 'confirm-unlink-account',
              options: {
                accountName: account.name,
                isViewBankSyncSettings: false,
                onUnlink: () => {
                  this.props.onUnlinkAccount(accountId);
                },
              },
            },
          }),
        );
        break;
      case 'close':
        void this.props.dispatch(openAccountCloseModal({ accountId }));
        break;
      case 'account-group':
        this.props.dispatch(
          pushModal({
            modal: {
              name: 'account-groups',
              options: {
                accountId,
              },
            },
          }),
        );
        break;
      case 'reopen':
        this.props.onReopenAccount(accountId);
        break;
      case 'export':
        const accountName = this.getAccountTitle(account, accountId);
        void this.onExport(accountName);
        break;
      case 'remove-sorting': {
        this.setState({ sort: null }, () => {
          const filterConditions = this.state.filterConditions;
          if (filterConditions.length > 0) {
            void this.applyFilters([...filterConditions]);
          } else {
            this.fetchTransactions();
          }
        });
        break;
      }
      case 'toggle-reconciled':
        if (this.state.showReconciled) {
          this.props.setShowReconciled(false);
          this.setState({ showReconciled: false }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        } else {
          this.props.setShowReconciled(true);
          this.setState({ showReconciled: true }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        }
        break;
      case 'toggle-net-worth-chart':
        if (this.props.showNetWorthChart) {
          this.props.setShowNetWorthChart(false);
        } else {
          this.props.setShowNetWorthChart(true);
        }
        break;
      case 'manage-columns':
        this.onManageColumns();
        break;
      default:
    }
  };

  showAccountColumn = () => {
    const accountId = this.props.accountId;
    return !accountId || SPECIAL_VIEW_IDS.includes(accountId);
  };

  onManageColumns = () => {
    const columns = this.props.transactionColumns
      .filter(
        column =>
          (column.id !== 'account' || this.showAccountColumn()) &&
          (column.id !== 'balance' || this.canCalculateBalance()),
      )
      .map(column => {
        // Balance and cleared visibility can be temporarily overridden in
        // component state (e.g. while reconciling) and may still come from
        // the old per-account prefs, so state is the source of truth here.
        if (column.id === 'balance') {
          return { ...column, hidden: !this.state.showBalances };
        }
        if (column.id === 'cleared') {
          // During reconciliation the cleared column is temporarily forced
          // visible, so show the user's underlying preference instead
          const showCleared =
            this.state.reconcileAmount != null
              ? this.state.prevShowCleared
              : this.state.showCleared;
          return { ...column, hidden: !showCleared };
        }
        // Group visibility may come from the legacy pref fallback rather
        // than the saved config, so the resolved prop is the source of truth
        if (column.id === 'group') {
          return { ...column, hidden: !this.props.showGroup };
        }
        return column;
      });

    this.props.dispatch(
      pushModal({
        modal: {
          name: 'transaction-table-columns',
          options: {
            columns,
            onSave: this.onSaveColumns,
          },
        },
      }),
    );
  };

  onSaveColumns = (columns: TransactionTableColumn[], applyToAll: boolean) => {
    // Columns that aren't managed in the current view (e.g. the account
    // column on a single-account page) keep their previous position and
    // visibility so a save here doesn't clobber them.
    const merged = [...columns];
    this.props.transactionColumns.forEach((column, index) => {
      if (!merged.some(c => c.id === column.id)) {
        merged.splice(Math.min(index, merged.length), 0, column);
      }
    });

    this.props.saveColumns(merged, applyToAll);

    // Toggling the balance column changes which queries run, so mirror the
    // change into component state and refetch when needed.
    const balance = columns.find(column => column.id === 'balance');
    const isBalanceVisible = balance && !balance.hidden;
    if (balance && isBalanceVisible !== !!this.state.showBalances) {
      if (!isBalanceVisible) {
        this.setState(
          { showBalances: false, balances: null },
          this.refreshVisibleQuery,
        );
      } else {
        this.setState(
          {
            transactions: [],
            filterConditions: [],
            filterId: undefined,
            filterConditionsOp: 'and',
            search: '',
            sort: null,
            showBalances: true,
          },
          () => {
            this.fetchTransactions();
          },
        );
      }
    }

    const cleared = columns.find(column => column.id === 'cleared');
    const isClearedVisible = cleared && !cleared.hidden;
    if (cleared && isClearedVisible !== !!this.state.showCleared) {
      // Also update prevShowCleared so finishing a reconciliation restores
      // the visibility chosen here, not the stale pre-reconcile value
      this.setState({
        showCleared: isClearedVisible,
        prevShowCleared: isClearedVisible,
      });
    }
  };

  getAccountTitle(account?: AccountEntity, id?: string) {
    const { filterName } = this.props.location.state || {};

    if (filterName) {
      return filterName;
    }

    if (!account) {
      if (id === 'onbudget') {
        return t('On Budget Accounts');
      } else if (id === 'offbudget') {
        return t('Off Budget Accounts');
      } else if (id === 'uncategorized') {
        return t('Uncategorized');
      } else if (!id) {
        return t('All Accounts');
      }
      return null;
    }

    return account.name;
  }

  getBalanceQuery(id?: string) {
    return {
      name: `balance-query-${id}`,
      query: this.makeRootTransactionsQuery().calculate({ $sum: '$amount' }),
    } as const;
  }

  isNew = (id: TransactionEntity['id']) => {
    return this.props.newTransactions.includes(id);
  };

  isMatched = (id: TransactionEntity['id']) => {
    return this.props.matchedTransactions.includes(id);
  };

  onCreatePayee = async (name: string) => {
    const trimmed = name.trim();
    if (trimmed !== '') {
      return await this.props.onCreatePayee(name);
    }
    return null;
  };

  lockTransactions = async () => {
    const { accountId } = this.props;
    if (!accountId) {
      return;
    }

    this.setState({ workingHard: true });

    await reconciliation.lockTransactions(accountId);
    await this.refetchTransactions();
  };

  onReconcile = async (amount: number | null) => {
    this.setState(
      ({ showCleared }) => ({
        reconcileAmount: amount,
        showCleared: true,
        prevShowCleared: showCleared,
      }),
      this.fetchTransactions,
    );
  };

  onDoneReconciling = async () => {
    const { accountId } = this.props;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found.`);
    }

    const { reconcileAmount } = this.state;

    await reconciliation.finishReconciliation(account.id, reconcileAmount, () =>
      this.lockTransactions(),
    );

    const lastReconciled = new Date().getTime().toString();
    this.props.onUpdateAccount({ ...account, last_reconciled: lastReconciled });

    this.setState(
      state => ({
        reconcileAmount: null,
        showCleared: state.prevShowCleared,
        filterId:
          state.filterId?.id &&
          state.filterConditionsOp === 'and' &&
          state.rangeConditions.length > 0
            ? { ...state.filterId, status: 'changed' }
            : state.filterId,
      }),
      this.fetchTransactions,
    );
  };

  onCreateReconciliationTransaction = async (diff: number) => {
    const { accountId } = this.props;
    if (!accountId) {
      return;
    }

    await reconciliation.createReconciliationTransaction(
      accountId,
      diff,
      // Optimistic UI: update the transaction list before sending the data to the database
      reconciliationTransactions =>
        this.setState(state => ({
          transactions: [...reconciliationTransactions, ...state.transactions],
        })),
    );
    await this.refetchTransactions();
  };

  onShowTransactions = async (ids: string[]) => {
    void this.onApplyFilter({
      customName: t('Selected transactions'),
      queryFilter: { id: { $oneof: ids } },
    });
  };

  onBatchEdit = (name: keyof TransactionEntity, ids: string[]) => {
    void this.props.onBatchEdit({
      name,
      ids,
      onSuccess: updatedIds => {
        void this.refetchTransactions();

        if (this.table.current) {
          this.table.current.edit(updatedIds[0], 'select', false);
        }
      },
    });
  };

  onBatchDuplicate = (ids: string[]) => {
    void this.props.onBatchDuplicate({
      ids,
      onSuccess: this.refetchTransactions,
    });
  };

  onBatchDelete = (ids: string[]) => {
    void this.props.onBatchDelete({ ids, onSuccess: this.refetchTransactions });
  };

  onMakeAsSplitTransaction = async (ids: string[]) => {
    this.setState({ workingHard: true });

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'none' }),
    );

    const transactions: TransactionEntity[] = data;

    if (!transactions || transactions.length === 0) {
      return;
    }

    const [firstTransaction] = transactions;
    const parentTransaction = {
      id: uuidv4(),
      is_parent: true,
      cleared: transactions.every(t => !!t.cleared),
      date: firstTransaction.date,
      account: firstTransaction.account,
      amount: transactions
        .map(t => t.amount)
        .reduce((total, amount) => total + amount, 0),
    };
    const childTransactions = transactions.map(t =>
      makeChild(parentTransaction, t),
    );

    await send('transactions-batch-update', {
      added: [parentTransaction],
      updated: childTransactions,
    });

    void this.refetchTransactions();
  };

  onMakeAsNonSplitTransactions = async (ids: string[]) => {
    this.setState({ workingHard: true });

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const groupedTransactions: TransactionEntity[] = data;

    let changes: {
      updated: TransactionEntity[];
      deleted: TransactionEntity[];
    } = {
      updated: [],
      deleted: [],
    };

    const groupedTransactionsToUpdate = groupedTransactions.filter(
      t => t.is_parent,
    );

    for (const groupedTransaction of groupedTransactionsToUpdate) {
      const transactions = ungroupTransaction(groupedTransaction);
      const [parentTransaction, ...childTransactions] = transactions;

      if (ids.includes(parentTransaction.id)) {
        // Unsplit all child transactions.
        const diff = makeAsNonChildTransactions(
          childTransactions,
          transactions,
        );

        changes = {
          updated: [...changes.updated, ...diff.updated],
          deleted: [...changes.deleted, ...diff.deleted],
        };

        // Already processed the child transactions above, no need to process them below.
        continue;
      }

      // Unsplit selected child transactions.

      const selectedChildTransactions = childTransactions.filter(t =>
        ids.includes(t.id),
      );

      if (selectedChildTransactions.length === 0) {
        continue;
      }

      const diff = makeAsNonChildTransactions(
        selectedChildTransactions,
        transactions,
      );

      changes = {
        updated: [...changes.updated, ...diff.updated],
        deleted: [...changes.deleted, ...diff.deleted],
      };
    }

    await send('transactions-batch-update', changes);

    void this.refetchTransactions();

    const transactionsToSelect = changes.updated.map(t => t.id);
    this.dispatchSelected?.({
      type: 'select-all',
      ids: transactionsToSelect,
    });
  };

  onMergeTransactions = async (ids: string[]) => {
    const keptId = await send(
      'transactions-merge',
      ids.map(id => ({ id })),
    );
    await this.refetchTransactions();
    this.dispatchSelected?.({
      type: 'select-all',
      ids: [keptId],
    });
  };

  checkForReconciledTransactions = async (
    ids: string[],
    confirmReason: ConfirmTransactionEditReason,
    onConfirm: (ids: string[]) => void,
  ) => {
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids }, reconciled: true })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);
    if (transactions.length > 0) {
      this.props.dispatch(
        pushModal({
          modal: {
            name: 'confirm-transaction-edit',
            options: {
              onConfirm: () => {
                onConfirm(ids);
              },
              confirmReason,
            },
          },
        }),
      );
    } else {
      onConfirm(ids);
    }
  };

  onBatchLinkSchedule = (ids: string[]) => {
    void this.props.onBatchLinkSchedule({
      ids,
      account: this.props.accounts.find(a => a.id === this.props.accountId),
      onSuccess: this.refetchTransactions,
    });
  };

  onBatchUnlinkSchedule = (ids: string[]) => {
    void this.props.onBatchUnlinkSchedule({
      ids,
      onSuccess: this.refetchTransactions,
    });
  };

  onCreateRule = async (ids: string[]) => {
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const transactions = ungroupTransactions(data);
    const ruleTransaction = transactions[0];
    const childTransactions = transactions.filter(
      t => t.parent_id === ruleTransaction.id,
    );

    const payeeCondition = ruleTransaction.imported_payee
      ? ({
          field: 'imported_payee',
          op: 'is',
          value: ruleTransaction.imported_payee,
          type: 'string',
        } satisfies RuleConditionEntity)
      : ({
          field: 'payee',
          op: 'is',
          value: ruleTransaction.payee!,
          type: 'id',
        } satisfies RuleConditionEntity);
    const amountCondition = {
      field: 'amount',
      op: 'isapprox',
      value: ruleTransaction.amount,
      type: 'number',
    } satisfies RuleConditionEntity;

    const rule = {
      stage: null,
      conditionsOp: 'and',
      conditions: [payeeCondition, amountCondition],
      actions: [
        ...(childTransactions.length === 0
          ? [
              {
                op: 'set',
                field: 'category',
                value: ruleTransaction.category,
                type: 'id',
                options: {
                  splitIndex: 0,
                },
              } satisfies RuleActionEntity,
            ]
          : []),
        ...childTransactions.flatMap((sub, index) => [
          {
            op: 'set-split-amount',
            value: sub.amount,
            options: {
              splitIndex: index + 1,
              method: 'fixed-amount',
            },
          } satisfies RuleActionEntity,
          {
            op: 'set',
            field: 'category',
            value: sub.category,
            type: 'id',
            options: {
              splitIndex: index + 1,
            },
          } satisfies RuleActionEntity,
        ]),
      ],
    } satisfies NewRuleEntity;

    this.props.dispatch(
      pushModal({ modal: { name: 'edit-rule', options: { rule } } }),
    );
  };

  onSetTransfer = async (ids: string[]) => {
    this.setState({ workingHard: true });
    await this.props.onSetTransfer(
      ids,
      this.props.payees,
      this.refetchTransactions,
    );
  };

  onConditionsOpChange = (value: 'and' | 'or') => {
    this.setState(({ filterId }) => ({
      filterConditionsOp: value,
      filterId: filterId?.id ? { ...filterId, status: 'changed' } : filterId,
    }));
    void this.applyFilters(this.state.filterConditions, value);
  };

  onReloadSavedFilter = (savedFilter: SavedFilter) => {
    if (savedFilter.status) {
      const conditionsOp = savedFilter.conditionsOp ?? 'and';
      this.setState({ filterConditionsOp: conditionsOp });
      this.applySavedConditions(savedFilter.conditions ?? [], conditionsOp);
    }
    this.setState(state => ({
      filterId: { ...state.filterId, ...savedFilter },
    }));
  };

  onClearFilters = () => {
    this.setState({ filterConditionsOp: 'and' });
    this.setState({ filterId: undefined });
    void this.applyFilters(
      [],
      'and',
      this.state.reconcileAmount == null ? [] : this.state.rangeConditions,
    );
  };

  onUpdateFilter = (
    oldCondition: RuleConditionEntity,
    updatedCondition: RuleConditionEntity,
  ) => {
    void this.applyFilters(
      this.state.filterConditions.map(c =>
        c === oldCondition ? updatedCondition : c,
      ),
    );
    this.setState(state => ({
      filterId: {
        ...state.filterId,
        status: state.filterId && 'changed',
      } as SavedFilter,
    }));
  };

  onDeleteFilter = (condition: RuleConditionEntity) => {
    void this.applyFilters(
      this.state.filterConditions.filter(c => c !== condition),
    );
    if (this.state.filterConditions.length === 1) {
      this.setState({ filterId: undefined, filterConditionsOp: 'and' });
    } else {
      this.setState(state => ({
        filterId: {
          ...state.filterId,
          status: state.filterId && 'changed',
        } as SavedFilter,
      }));
    }
  };

  onApplyFilter = async (conditionOrSavedFilter: ConditionEntity) => {
    let filterConditions = this.state.filterConditions;

    if (
      'customName' in conditionOrSavedFilter &&
      conditionOrSavedFilter.customName
    ) {
      filterConditions = filterConditions.filter(
        c =>
          !isTransactionFilterEntity(c) &&
          c.customName !== conditionOrSavedFilter.customName,
      );
    }

    if (isTransactionFilterEntity(conditionOrSavedFilter)) {
      // A saved filter was passed in.
      const savedFilter = conditionOrSavedFilter;
      this.setState({
        filterId: { ...savedFilter, status: 'saved' },
      });
      this.setState({ filterConditionsOp: savedFilter.conditionsOp });
      this.applySavedConditions(
        savedFilter.conditions,
        savedFilter.conditionsOp ?? 'and',
      );
    } else {
      // A condition was passed in.
      const condition = conditionOrSavedFilter;
      const isDuplicate = filterConditions.some(c => isEqual(c, condition));

      if (isDuplicate) {
        return;
      }

      this.setState(state => ({
        filterId: {
          ...state.filterId,
          status: state.filterId && 'changed',
        } as SavedFilter,
      }));
      if (
        this.state.reconcileAmount == null &&
        this.state.filterConditionsOp === 'and' &&
        condition.field === 'date' &&
        condition.op &&
        condition.value != null
      ) {
        this.onDateRangeChange(
          addDateCondition(
            [...this.state.rangeConditions, ...this.expressionDates()],
            {
              ...condition,
              field: condition.field,
              op: condition.op,
              value: condition.value,
            },
          ),
        );
      } else {
        void this.applyFilters([...filterConditions, condition]);
      }
    }
  };

  onScheduleAction = async (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => {
    const scheduleIds = ids.map(id => id.split('/')[1]);

    switch (name) {
      case 'post-transaction':
        for (const id of scheduleIds) {
          await send('schedule/post-transaction', { id });
        }
        void this.refetchTransactions();
        break;
      case 'post-transaction-today':
        for (const id of scheduleIds) {
          await send('schedule/post-transaction', { id, today: true });
        }
        void this.refetchTransactions();
        break;
      case 'skip':
        for (const id of scheduleIds) {
          await send('schedule/skip-next-date', { id });
        }
        break;
      case 'complete':
        for (const id of scheduleIds) {
          await send('schedule/update', { schedule: { id, completed: true } });
        }
        break;
      default:
    }
  };

  applySavedConditions = (
    conditions: RuleConditionEntity[],
    op: 'and' | 'or',
  ) => {
    void this.applyFilters(
      conditions,
      op,
      this.state.reconcileAmount == null ? [] : this.state.rangeConditions,
    );
  };

  expressionDates = () =>
    this.state.filterConditions.flatMap(condition =>
      'field' in condition &&
      condition.field === 'date' &&
      condition.op &&
      condition.value != null
        ? [
            {
              ...condition,
              field: condition.field,
              op: condition.op,
              value: condition.value,
            },
          ]
        : [],
    );

  onClearDateAlternatives = () => {
    const conditions = this.state.filterConditions.filter(
      condition => !isDateFilter(condition),
    );
    const conditionsOp =
      conditions.length <= 1 ? 'and' : this.state.filterConditionsOp;
    this.setState(({ filterId }) => ({
      filterConditionsOp: conditionsOp,
      filterId: filterId?.id ? { ...filterId, status: 'changed' } : filterId,
    }));
    void this.applyFilters(conditions, conditionsOp, []);
  };

  onDateRangeChange = (dates: RuleConditionEntity[]) => {
    const { filterConditions, filterConditionsOp } = this.state;
    const editsExpression =
      filterConditionsOp === 'and' && filterConditions.some(isDateFilter);
    if (editsExpression && dates.length === 0) {
      this.onClearDateAlternatives();
      return;
    }
    if (filterConditionsOp === 'and') {
      this.setState(({ filterId }) => ({
        filterId: filterId?.id ? { ...filterId, status: 'changed' } : filterId,
      }));
    }
    const conditions = editsExpression
      ? [
          ...filterConditions.filter(condition => !isDateFilter(condition)),
          ...dates,
        ]
      : filterConditions;
    void this.applyFilters(
      conditions,
      filterConditionsOp,
      editsExpression ? [] : dates,
    );
  };

  applyFilters = async (
    conditions: ConditionEntity[],
    conditionsOp = this.state.filterConditionsOp,
    rangeConditions = this.state.rangeConditions,
  ) => {
    const revision = ++this.filterRevision;
    this.setState({ filterConditions: conditions, rangeConditions });
    const { dateFree, dated } = await accountDateQueries(
      this.rootQuery,
      conditions,
      conditionsOp,
      this.state.reconcileAmount == null ? rangeConditions : [],
    );
    if (revision !== this.filterRevision) return;

    this.currentQuery = dated;
    this.setState({ dateFreeQuery: dateFree }, () => {
      if (revision !== this.filterRevision) return;
      this.refreshVisibleQuery();
    });
  };

  onSort = (field: string, ascDesc: 'asc' | 'desc') => {
    this.setState(
      ({ sort }) => ({
        sort: {
          field,
          ascDesc,
          prevField: field === sort?.field ? sort.prevField : sort?.field,
          prevAscDesc: field === sort?.field ? sort.prevAscDesc : sort?.ascDesc,
        },
      }),
      this.refreshVisibleQuery,
    );
  };

  render() {
    const {
      accounts,
      categoryGroups,
      payees,
      dateFormat,
      hideFraction,
      accountsSyncing,
      showExtraBalances,
      accountId,
      categoryId,
    } = this.props;
    const {
      transactions,
      loading,
      workingHard,
      filterId,
      reconcileAmount,
      transactionsFiltered,
      showBalances,
      balances,
      showCleared,
      showReconciled,
      totals,
      dateFreeQuery,
    } = this.state;

    const account = accounts.find(account => account.id === accountId);
    const accountName = this.getAccountTitle(account, accountId);

    if (!accountName && !loading) {
      // This is probably an account that was deleted, so redirect to
      // all accounts
      return <Navigate to="/accounts" replace />;
    }

    const category = categoryGroups
      .flatMap(g => g.categories)
      .find(category => category?.id === categoryId);

    const showEmptyMessage = !loading && !accountId && accounts.length === 0;

    const isNameEditable = accountId
      ? accountId !== 'onbudget' &&
        accountId !== 'offbudget' &&
        accountId !== 'uncategorized'
      : false;

    const balanceQuery = this.getBalanceQuery(accountId);

    const selectAllFilter = (item: TransactionEntity): boolean => {
      if (item.is_parent) {
        const children = transactions.filter(t => t.parent_id === item.id);
        return children.every(t => selectAllFilter(t));
      }
      return !item._unmatched;
    };

    return (
      <AllTransactions
        account={account}
        transactions={transactions}
        balances={balances}
        showBalances={showBalances}
        showPreviews={
          !this.state.search &&
          (reconcileAmount == null && this.state.filterConditionsOp === 'and'
            ? this.state.filterConditions.every(isDateFilter)
            : this.state.filterConditions.length === 0) &&
          (!accountId || !!account)
        }
        rangeConditions={
          reconcileAmount == null
            ? [
                ...this.state.rangeConditions,
                ...(this.state.filterConditionsOp === 'and'
                  ? this.expressionDates()
                  : []),
              ]
            : []
        }
      >
        {(allTransactions, allBalances) => (
          <SelectedProviderWithItems
            name="transactions"
            // When reconciled transactions are hidden they are still
            // loaded (e.g. to calculate running balances), but they must
            // not be selectable. Mirror the filtering the transaction
            // table applies when rendering so that range selection
            // (shift+click) only covers visible transactions.
            items={
              showReconciled
                ? allTransactions
                : allTransactions.filter(t => !t.reconciled)
            }
            fetchAllIds={this.fetchAllIds}
            registerDispatch={dispatch => (this.dispatchSelected = dispatch)}
            selectAllFilter={selectAllFilter}
          >
            <View style={styles.page}>
              <AccountHeader
                tableRef={this.table}
                isNameEditable={isNameEditable ?? false}
                workingHard={workingHard ?? false}
                accountId={accountId}
                account={account}
                filterId={filterId}
                savedFilters={this.props.savedFilters}
                accountName={accountName}
                accountsSyncing={accountsSyncing}
                accounts={accounts}
                transactions={transactions}
                showExtraBalances={showExtraBalances ?? false}
                showReconciled={showReconciled ?? false}
                showEmptyMessage={showEmptyMessage ?? false}
                balanceQuery={balanceQuery}
                isSorted={this.state.sort !== null}
                reconcileAmount={reconcileAmount}
                search={this.state.search}
                // @ts-expect-error fix me
                filterConditions={this.state.filterConditions}
                filterConditionsOp={this.state.filterConditionsOp}
                rangeConditions={this.state.rangeConditions}
                chartQuery={
                  dateFreeQuery &&
                  this.queryWithReconciledVisibility(
                    this.queryWithSearch(dateFreeQuery),
                  )
                }
                onDateRangeChange={this.onDateRangeChange}
                onClearDateAlternatives={this.onClearDateAlternatives}
                onSearch={this.onSearch}
                onShowTransactions={this.onShowTransactions}
                onMenuSelect={this.onMenuSelect}
                onAddTransaction={this.onAddTransaction}
                onToggleExtraBalances={this.onToggleExtraBalances}
                onSaveName={this.onSaveName}
                saveNameError={this.state.nameError}
                onReconcile={this.onReconcile}
                onDoneReconciling={this.onDoneReconciling}
                onCreateReconciliationTransaction={
                  this.onCreateReconciliationTransaction
                }
                onSync={this.onSync}
                onImport={this.onImport}
                onBatchDelete={this.onBatchDelete}
                onBatchDuplicate={this.onBatchDuplicate}
                onRunRules={this.onRunRules}
                onBatchEdit={this.onBatchEdit}
                onBatchLinkSchedule={this.onBatchLinkSchedule}
                onBatchUnlinkSchedule={this.onBatchUnlinkSchedule}
                onCreateRule={this.onCreateRule}
                onUpdateFilter={this.onUpdateFilter}
                onClearFilters={this.onClearFilters}
                onReloadSavedFilter={this.onReloadSavedFilter}
                onConditionsOpChange={this.onConditionsOpChange}
                onDeleteFilter={this.onDeleteFilter}
                onApplyFilter={this.onApplyFilter}
                onScheduleAction={this.onScheduleAction}
                onSetTransfer={this.onSetTransfer}
                onMakeAsSplitTransaction={this.onMakeAsSplitTransaction}
                onMakeAsNonSplitTransactions={this.onMakeAsNonSplitTransactions}
                onMergeTransactions={this.onMergeTransactions}
              />

              <View style={{ flex: 1 }}>
                <TransactionList
                  headerContent={undefined}
                  // @ts-expect-error - fix me
                  tableRef={this.table}
                  account={account}
                  transactions={transactions}
                  allTransactions={allTransactions}
                  loadMoreTransactions={() =>
                    this.paged && this.paged.fetchNext()
                  }
                  accounts={accounts}
                  category={category}
                  categoryGroups={categoryGroups}
                  payees={payees}
                  balances={allBalances}
                  showBalances={!!allBalances}
                  showReconciled={showReconciled}
                  showCleared={!!showCleared}
                  showGroup={this.props.showGroup}
                  showAccount={this.showAccountColumn()}
                  columnOrder={this.props.columnOrder}
                  allowReorder={
                    !!accountId &&
                    accountId !== 'offbudget' &&
                    accountId !== 'onbudget' &&
                    accountId !== 'uncategorized'
                  }
                  isAdding={this.state.isAdding}
                  isNew={this.isNew}
                  isMatched={this.isMatched}
                  isFiltered={transactionsFiltered}
                  totals={totals}
                  dateFormat={dateFormat}
                  hideFraction={hideFraction}
                  renderEmpty={() =>
                    showEmptyMessage ? (
                      <AccountEmptyMessage
                        onAdd={() =>
                          this.props.dispatch(
                            replaceModal({
                              modal: { name: 'add-account', options: {} },
                            }),
                          )
                        }
                      />
                    ) : !loading ? (
                      <View
                        style={{
                          color: theme.tableText,
                          marginTop: 20,
                          textAlign: 'center',
                          fontStyle: 'italic',
                        }}
                      >
                        <Trans>No transactions</Trans>
                      </View>
                    ) : null
                  }
                  onSort={this.onSort}
                  sortField={this.state.sort?.field ?? ''}
                  ascDesc={this.state.sort?.ascDesc ?? 'asc'}
                  onChange={this.onTransactionsChange}
                  onBatchDelete={this.onBatchDelete}
                  onBatchDuplicate={this.onBatchDuplicate}
                  onBatchLinkSchedule={this.onBatchLinkSchedule}
                  onBatchUnlinkSchedule={this.onBatchUnlinkSchedule}
                  onCreateRule={this.onCreateRule}
                  onScheduleAction={this.onScheduleAction}
                  onMakeAsNonSplitTransactions={
                    this.onMakeAsNonSplitTransactions
                  }
                  onRefetch={this.refetchTransactions}
                  onCloseAddTransaction={() =>
                    this.setState({ isAdding: false })
                  }
                  onCreatePayee={this.onCreatePayee}
                  onApplyFilter={this.onApplyFilter}
                />
              </View>
            </View>
          </SelectedProviderWithItems>
        )}
      </AllTransactions>
    );
  }
}

type AccountHackProps = Omit<
  AccountInternalProps,
  | 'dispatch'
  | 'splitsExpandedDispatch'
  | 'onBatchEdit'
  | 'onBatchDuplicate'
  | 'onBatchLinkSchedule'
  | 'onBatchUnlinkSchedule'
  | 'onBatchDelete'
  | 'onSetTransfer'
>;

function AccountHack(props: AccountHackProps) {
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const dispatch = useDispatch();
  const {
    onBatchEdit,
    onBatchDuplicate,
    onBatchLinkSchedule,
    onBatchUnlinkSchedule,
    onBatchDelete,
    onSetTransfer,
  } = useTransactionBatchActions();

  return (
    <AccountInternal
      dispatch={dispatch}
      splitsExpandedDispatch={splitsExpandedDispatch}
      onBatchEdit={onBatchEdit}
      onBatchDuplicate={onBatchDuplicate}
      onBatchLinkSchedule={onBatchLinkSchedule}
      onBatchUnlinkSchedule={onBatchUnlinkSchedule}
      onBatchDelete={onBatchDelete}
      onSetTransfer={onSetTransfer}
      {...props}
    />
  );
}

export function Account() {
  const params = useParams();
  const location = useLocation();

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const newTransactions = useSelector(
    state => state.transactions.newTransactions,
  );
  const matchedTransactions = useSelector(
    state => state.transactions.matchedTransactions,
  );
  const { data: accounts = [] } = useAccounts();
  const { data: payees = [] } = usePayees();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [hideFraction] = useSyncedPref('hideFraction');
  const [expandSplits] = useLocalPref('expand-splits');
  const [showNetWorthChart, setShowNetWorthChart] = useSyncedPref(
    `show-account-${params.id}-net-worth-chart`,
  );
  const [hideReconciled, setHideReconciled] = useSyncedPref(
    `hide-reconciled-${params.id || 'all'}`, // "All accounts" view provides no ID
  );
  const [showExtraBalances, setShowExtraBalances] = useSyncedPref(
    `show-extra-balances-${params.id || 'all-accounts'}`,
  );
  const {
    transactionColumns,
    columnOrder,
    showBalances,
    showCleared,
    showGroup,
    saveColumns,
  } = useTransactionTableColumns(params.id);

  const modalShowing = useSelector(state => state.modals.modalStack.length > 0);
  const accountsSyncing = useSelector(state => state.account.accountsSyncing);
  const filterConditions = location?.state?.filterConditions || [];

  const savedFiters = useTransactionFilters();

  const schedulesQuery = useMemo(
    () => getSchedulesQuery(params.id),
    [params.id],
  );

  const { mutate: reopenAccount } = useReopenAccountMutation();
  const onReopenAccount = (id: AccountEntity['id']) => reopenAccount({ id });

  const { mutate: updateAccount } = useUpdateAccountMutation();
  const onUpdateAccount = (account: AccountEntity) =>
    updateAccount({ account });

  const { mutate: unlinkAccount } = useUnlinkAccountMutation();
  const onUnlinkAccount = (id: AccountEntity['id']) => unlinkAccount({ id });

  const { mutate: syncAndDownload } = useSyncAndDownloadMutation();
  const onSyncAndDownload = (id?: AccountEntity['id']) =>
    syncAndDownload({ id });

  const createPayee = useCreatePayeeMutation();
  const onCreatePayee = (name: PayeeEntity['name']) =>
    createPayee.mutateAsync({ name });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <SchedulesProvider query={schedulesQuery}>
        <SplitsExpandedProvider
          initialMode={expandSplits ? 'collapse' : 'expand'}
        >
          <AccountHack
            newTransactions={newTransactions}
            matchedTransactions={matchedTransactions}
            accounts={accounts}
            dateFormat={dateFormat}
            hideFraction={String(hideFraction) === 'true'}
            expandSplits={expandSplits}
            showBalances={showBalances}
            showNetWorthChart={String(showNetWorthChart) === 'true'}
            setShowNetWorthChart={val => setShowNetWorthChart(String(val))}
            showCleared={showCleared}
            showReconciled={String(hideReconciled) !== 'true'}
            setShowReconciled={val => setHideReconciled(String(!val))}
            showGroup={showGroup}
            showExtraBalances={String(showExtraBalances) === 'true'}
            setShowExtraBalances={extraBalances =>
              setShowExtraBalances(String(extraBalances))
            }
            transactionColumns={transactionColumns}
            columnOrder={columnOrder}
            saveColumns={saveColumns}
            payees={payees}
            modalShowing={modalShowing}
            accountsSyncing={accountsSyncing}
            filterConditions={filterConditions}
            categoryGroups={categoryGroups}
            accountId={params.id}
            categoryId={location?.state?.categoryId}
            location={location}
            savedFilters={savedFiters}
            onReopenAccount={onReopenAccount}
            onUpdateAccount={onUpdateAccount}
            onUnlinkAccount={onUnlinkAccount}
            onSyncAndDownload={onSyncAndDownload}
            onCreatePayee={onCreatePayee}
          />
        </SplitsExpandedProvider>
      </SchedulesProvider>
    </ErrorBoundary>
  );
}
