import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as months from '@actual-app/core/shared/months';
import type { Query } from '@actual-app/core/shared/query';
import type { RuleConditionEntity } from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import {
  displayedTransactionGroups,
  selectTransactionGroups,
} from '#components/transactions/TransactionTotals';
import type { TransactionGroup } from '#components/transactions/TransactionTotals';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useQuery } from '#hooks/useQuery';

import {
  describeDateFilters,
  isDateFilter,
  monthFilter,
  monthRange,
  rangeFilters,
} from './account-date-filters';
import type { AccountFilter } from './account-date-filters';

type AccountDateRangeProps = {
  conditions: AccountFilter[];
  chartQuery: Query | null;
  onChange: (conditions: RuleConditionEntity[]) => void;
};

export function AccountDateRange({
  conditions,
  chartQuery,
  onChange,
}: AccountDateRangeProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [availableWidth, setAvailableWidth] = useState(480);
  useEffect(() => {
    if (!isOpen) return;
    function measure() {
      if (!trigger.current) return;
      setAvailableWidth(
        (document.documentElement.clientWidth || window.innerWidth) -
          trigger.current.getBoundingClientRect().left -
          12,
      );
    }
    measure();
    window.addEventListener('resize', measure);
    const observer = new ResizeObserver(measure);
    if (trigger.current?.parentElement) {
      observer.observe(trigger.current.parentElement);
    }
    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [isOpen]);
  const hasDate = conditions.some(isDateFilter);
  const bounds = describeDateFilters(conditions);
  const { start, end } = bounds ?? {};
  const anchor = (start ?? end)?.slice(0, 7) ?? months.currentMonth();
  const month = monthRange(anchor);
  const formatDay = (day: string) => months.format(day, 'PP', locale);
  let label = t('All dates');
  if (hasDate) {
    if (start === month.start && end === month.end) {
      label = months.format(anchor, 'MMMM yyyy', locale);
    } else if (start && end) {
      label =
        start === end
          ? formatDay(start)
          : new Intl.DateTimeFormat(locale.code, {
              dateStyle: 'medium',
              timeZone: 'UTC',
            }).formatRange(new Date(start), new Date(end));
    } else if (start) {
      label = t('From {{date}}', { date: formatDay(start) });
    } else if (end) {
      label = t('Through {{date}}', { date: formatDay(end) });
    } else {
      label = t('Custom date filter');
    }
  }

  function selectMonth(month: string) {
    onChange([monthFilter(month)]);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 12,
        rowGap: 4,
        paddingBlock: 4,
      }}
    >
      <Button
        style={{ borderRadius: 999, paddingInline: 16 }}
        isDisabled={
          anchor === months.currentMonth() &&
          start === month.start &&
          end === month.end
        }
        onPress={() => selectMonth(months.currentMonth())}
      >
        <Trans>Today</Trans>
      </Button>
      <View style={{ flexDirection: 'row' }}>
        <Button
          variant="bare"
          style={{ width: 32, justifyContent: 'center' }}
          aria-label={t('Previous month')}
          onPress={() => selectMonth(months.addMonths(anchor, -1))}
        >
          <SvgCheveronLeft width={14} height={14} />
        </Button>
        <Button
          variant="bare"
          style={{ width: 32, justifyContent: 'center' }}
          aria-label={t('Next month')}
          onPress={() => selectMonth(months.addMonths(anchor, 1))}
        >
          <SvgCheveronRight width={14} height={14} />
        </Button>
      </View>
      <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <Button
          ref={trigger}
          variant="bare"
          style={{
            fontSize: 20,
            fontWeight: 500,
            textAlign: 'start',
            maxWidth: '100%',
            whiteSpace: 'normal',
          }}
        >
          {label}
        </Button>
        <Popover
          placement="bottom start"
          shouldFlip
          offset={6}
          style={{ width: 480, maxWidth: Math.max(availableWidth, 0) }}
        >
          <Dialog
            aria-label={t('Transaction date range')}
            style={{
              padding: 12,
              outline: 'none',
              overflow: 'auto',
              maxHeight: 'inherit',
            }}
          >
            <MonthChart
              query={chartQuery}
              startMonth={start?.slice(0, 7) ?? anchor}
              endMonth={end?.slice(0, 7) ?? anchor}
              hasDate={hasDate}
              onSelect={(first, last) =>
                first === last
                  ? selectMonth(first)
                  : onChange(rangeFilters(monthRange(first, last)))
              }
            />
            <form
              key={`${start}-${end}`}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'end',
                marginTop: 12,
              }}
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                const start = values.get('start');
                const end = values.get('end');
                if (
                  typeof start === 'string' &&
                  typeof end === 'string' &&
                  months.isValidYearMonthDay(start) &&
                  months.isValidYearMonthDay(end)
                ) {
                  const [first, last] = [start, end].sort();
                  onChange(rangeFilters({ start: first, end: last }));
                  setIsOpen(false);
                }
              }}
            >
              <label style={{ display: 'grid', gap: 4 }}>
                <Trans>Start date</Trans>{' '}
                <Input
                  name="start"
                  type="date"
                  required
                  defaultValue={start}
                  min="0001-01-01"
                  max="9999-12-31"
                  style={{ colorScheme: 'light dark' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <Trans>End date</Trans>{' '}
                <Input
                  name="end"
                  type="date"
                  required
                  defaultValue={end}
                  min="0001-01-01"
                  max="9999-12-31"
                  style={{ colorScheme: 'light dark' }}
                />
              </label>
              <Button type="submit">
                <Trans>Apply dates</Trans>
              </Button>
            </form>
          </Dialog>
        </Popover>
      </DialogTrigger>
      {hasDate && (
        <Button style={{ borderRadius: 999 }} onPress={() => onChange([])}>
          <Trans>All dates</Trans>
        </Button>
      )}
    </View>
  );
}

function MonthChart({
  query,
  startMonth,
  endMonth,
  hasDate,
  onSelect,
}: {
  query: Query | null;
  startMonth: string;
  endMonth: string;
  hasDate: boolean;
  onSelect: (start: string, end: string) => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const format = useFormat();
  const [anchor, setAnchor] = useState(startMonth);
  const [inspectedMonth, setInspectedMonth] = useState<string>();
  const dragStart = useRef<string | null>(null);

  const selectedBar = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const { data, isLoading, error } = useQuery<TransactionGroup>(
    () => (query ? selectTransactionGroups(query) : null),
    [query],
  );

  useEffect(() => {
    if (container.current && selectedBar.current) {
      container.current.scrollLeft =
        selectedBar.current.offsetLeft - container.current.clientWidth / 2;
    }
  }, [data]);

  if (!query || isLoading) return <Trans>Loading transactions…</Trans>;
  if (error) return <Trans>Could not load transactions.</Trans>;

  const activity = new Map<string, { count: number; net: number }>();
  let peak = 0;
  for (const { date, amount } of displayedTransactionGroups(data ?? [])) {
    if (!date) continue;
    const month = date.slice(0, 7);
    const previous = activity.get(month) ?? { count: 0, net: 0 };
    const count = previous.count + 1;
    activity.set(month, { count, net: previous.net + amount });
    peak = Math.max(peak, count);
  }
  const boundaries = [...activity.keys(), startMonth, endMonth].sort();
  const first = boundaries[0];
  const last = boundaries[boundaries.length - 1];
  const countLabel = (count: number) =>
    count === 1 ? t('1 transaction') : t('{{count}} transactions', { count });

  function selectSpan(first: string, last: string) {
    onSelect(first <= last ? first : last, first <= last ? last : first);
  }

  const inspected = inspectedMonth ? activity.get(inspectedMonth) : undefined;

  return (
    <>
      <View style={{ color: theme.pageTextSubdued, gap: 4 }}>
        <Trans>Choose a month. Shift-click or drag to select a range.</Trans>
        <div>
          <Trans>Peak: {{ peak: countLabel(peak) }}</Trans>
        </div>
      </View>
      <div
        ref={container}
        role="group"
        aria-label={t('Transactions by month')}
        onPointerCancel={() => {
          dragStart.current = null;
        }}
        onPointerUp={event => {
          const first = dragStart.current;
          dragStart.current = null;
          if (!first) return;
          const last =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>('[data-month]')?.dataset.month
              : undefined;
          if (last && last !== first) {
            setAnchor(first);
            selectSpan(first, last);
          }
        }}
        style={{
          display: 'flex',
          overflowX: 'auto',
          position: 'relative',
        }}
      >
        {months.rangeInclusive(first, last).map(month => {
          const count = activity.get(month)?.count ?? 0;
          const selected = hasDate && startMonth <= month && month <= endMonth;
          const monthLabel = months.format(month, 'MMMM yyyy', locale);
          const title = t('{{month}}: {{transactions}}', {
            month: monthLabel,
            transactions: countLabel(count),
          });
          return (
            <Button
              key={month}
              data-month={month}
              ref={month === startMonth ? selectedBar : undefined}
              variant="bare"
              aria-label={title}
              aria-pressed={selected}
              onHoverStart={() => setInspectedMonth(month)}
              onHoverEnd={() => setInspectedMonth(undefined)}
              onFocus={() => setInspectedMonth(month)}
              onBlur={() => setInspectedMonth(undefined)}
              onPointerDown={event => {
                dragStart.current =
                  event.pointerType === 'mouse' && event.button === 0
                    ? month
                    : null;
              }}
              onPress={event => {
                if (event.shiftKey) {
                  selectSpan(anchor, month);
                } else {
                  setAnchor(month);
                  onSelect(month, month);
                }
              }}
              style={{
                flexDirection: 'column',
                flexShrink: 0,
                width: 48,
                padding: '4px 0',
                gap: 4,
                color: selected
                  ? theme.buttonPrimaryBackground
                  : theme.pageText,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  height: 64,
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'end',
                  borderBottom: '1px solid ' + theme.tableBorder,
                }}
              >
                {count > 0 && (
                  <span
                    style={{
                      width: 22,
                      height: Math.max(3, (64 * count) / peak),
                      backgroundColor: selected
                        ? theme.buttonPrimaryBackground
                        : theme.pageTextSubdued,
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                )}
              </span>
              <span>{months.format(month, 'MMM yy', locale)}</span>
            </Button>
          );
        })}
      </div>
      <View style={{ minHeight: 24, justifyContent: 'center' }}>
        {inspectedMonth && (
          <div role="tooltip">
            {months.format(inspectedMonth, 'MMMM yyyy', locale)}
            {' · '}
            {countLabel(inspected?.count ?? 0)}
            {' · '}
            <Trans>Net</Trans>{' '}
            <PrivacyFilter>
              <FinancialText>
                {format(inspected?.net ?? 0, 'financial')}
              </FinancialText>
            </PrivacyFilter>
          </div>
        )}
      </View>
    </>
  );
}
