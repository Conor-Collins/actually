import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SetAsideRow } from '@actual-app/core/shared/period-loader';

import { useNavigate } from '#hooks/useNavigate';
import { isDay, usePeriodBudgetMutation } from '#period-budget';
import type {
  AttentionItem,
  PeriodBudgetView,
  PeriodBudgetWrite,
} from '#period-budget';

import { Money } from './Money';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type NeedsAttentionProps = {
  view: PeriodBudgetView;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  onOpenCategory: (categoryId: string) => void;
};

type Fix = {
  label: string;
  onPress: () => void;
};

type Described = {
  text: ReactNode;
  detail?: string;
  fixes: Fix[];
};

// What the calculation left out or could not place, each with what fixes it.
export function NeedsAttention({
  view,
  data,
  labels,
  onOpenCategory,
}: NeedsAttentionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isNarrowWidth } = useResponsive();
  const mutation = usePeriodBudgetMutation();
  const items = view.attention;

  function write(step: PeriodBudgetWrite) {
    mutation.mutate([step]);
  }

  // Why a stored row is not counted, in the user's language. The server's
  // own sentence is English and is not shown.
  function reasonText(row: SetAsideRow): string {
    switch (row.reason) {
      case 'duplicate-id':
        return t('it is stored more than once');
      case 'invalid-period':
        return t('its days or its allowance cannot be used');
      case 'overlap':
        return t('it overlaps another period of its category');
      case 'offset-period-missing':
        return t('the period is deleted or is not counted');
      case 'offset-category-mismatch':
        return t('the payment has another category than the period');
      case 'charge-period-missing':
        return t('no period that is counted has its day');
      case 'invalid-charge':
      case 'invalid-transaction':
        return t('its day or its amount cannot be used');
      case 'amounts-too-large':
        return t('the amounts are too large to be added up');
      default:
        return t('it cannot be used');
    }
  }

  function describeOverride(row: SetAsideRow): Described {
    const removeChange: Fix = {
      label: t('Remove the change'),
      onPress: () =>
        write({
          name: 'period-budget/clear-charge-override',
          args: { id: row.id },
        }),
    };
    // The id is "<schedule id>:<due date>"
    const index = row.id.lastIndexOf(':');
    const scheduleId = row.id.slice(0, Math.max(index, 0));
    const dueDate = row.id.slice(index + 1);
    if (index <= 0 || !isDay(dueDate)) {
      return {
        text: t('A change to a scheduled charge cannot be read'),
        fixes: [removeChange],
      };
    }
    const words = {
      schedule: data.scheduleName(scheduleId),
      date: labels.day(dueDate),
    };
    if (row.reason === 'override-without-charge') {
      return {
        text: t(
          'A change to {{schedule}} is stored for {{date}}, and no charge is due on that day',
          words,
        ),
        fixes: [removeChange],
      };
    }
    if (row.problem === 'amount') {
      return {
        text: t(
          'The expected amount that is stored for {{schedule}} of {{date}} cannot be used',
          words,
        ),
        fixes: [removeChange],
      };
    }
    if (row.problem === 'open-amount') {
      return {
        text: t(
          'The still expected amount that is stored for {{schedule}} of {{date}} cannot be used',
          words,
        ),
        fixes: [removeChange],
      };
    }
    if (row.problem === 'payment-missing' || row.problem === 'payment-taken') {
      return {
        text:
          row.problem === 'payment-missing'
            ? t(
                'The payment that is named for {{schedule}} of {{date}} does not exist any more',
                words,
              )
            : t(
                'The payment that is named for {{schedule}} of {{date}} pays an earlier charge already',
                words,
              ),
        fixes: [
          {
            label: t('Use the payment that matches the schedule'),
            onPress: () =>
              write({
                name: 'period-budget/set-charge-override',
                args: { scheduleId, dueDate, transactionId: null },
              }),
          },
          removeChange,
        ],
      };
    }
    return {
      text: t('A change to {{schedule}} of {{date}} cannot be used', words),
      fixes: [removeChange],
    };
  }

  function describe(item: AttentionItem): Described {
    if (item.kind === 'unresolved') {
      return {
        text: (
          <>
            {t('Spending without a category ({{count}})', {
              count: item.count,
            })}{' '}
            <Money amount={item.total} />
          </>
        ),
        fixes: [
          {
            label: t('Categorize the transactions'),
            onPress: () =>
              navigate(
                isNarrowWidth
                  ? '/categories/uncategorized'
                  : '/accounts/uncategorized',
              ),
          },
        ],
      };
    }

    if (item.kind === 'unassigned') {
      const category = data.categoryName(item.category);
      return {
        text: (
          <>
            {t('Spending of {{category}} that is in no period ({{count}})', {
              category,
              count: item.payments.length,
            })}{' '}
            <Money amount={item.total} />
          </>
        ),
        fixes: [
          {
            label: t('Add a period to {{category}}', { category }),
            onPress: () => onOpenCategory(item.category),
          },
        ],
      };
    }

    if (item.kind === 'charges-without-period') {
      const category = data.categoryName(item.category);
      const schedule = data.scheduleName(item.scheduleId);
      const [first] = item.charges;
      return {
        text: t(
          'Charges of {{schedule}} are due on days with no period of {{category}} ({{count}}, the first on {{date}})',
          {
            schedule,
            category,
            count: item.charges.length,
            date: labels.day(first.dueDate),
          },
        ),
        fixes: [
          {
            label: t('Add a period to {{category}}', { category }),
            onPress: () => onOpenCategory(item.category),
          },
          {
            label: t('Unlink {{schedule}}', { schedule }),
            onPress: () =>
              write({
                name: 'period-budget/unlink-schedule',
                args: { scheduleId: item.scheduleId },
              }),
          },
        ],
      };
    }

    const { row, category } = item;
    if (row.table === 'period_budgets') {
      const fixes: Fix[] = [
        {
          label: t('Delete the period'),
          onPress: () =>
            write({
              name: 'period-budget/delete-period',
              args: { id: row.id },
            }),
        },
      ];
      if (category !== null) {
        fixes.push({
          label: t('Open {{category}}', {
            category: data.categoryName(category),
          }),
          onPress: () => onOpenCategory(category),
        });
      }
      return {
        text:
          category === null
            ? t('A period is not counted')
            : t('A period of {{category}} is not counted', {
                category: data.categoryName(category),
              }),
        detail: reasonText(row),
        fixes,
      };
    }
    if (row.table === 'period_offsets') {
      return {
        text: t('The period chosen for a payment is not used'),
        detail: reasonText(row),
        fixes: [
          {
            label: t('Remove the choice'),
            onPress: () =>
              write({
                name: 'period-budget/clear-offset',
                args: { transactionId: row.id },
              }),
          },
        ],
      };
    }
    if (row.table === 'period_charge_overrides') {
      return describeOverride(row);
    }
    if (row.table === 'charges') {
      return {
        text: t('A scheduled charge is not counted'),
        detail: reasonText(row),
        fixes: [
          {
            label: t('Open the schedules'),
            onPress: () => navigate('/schedules'),
          },
        ],
      };
    }
    return {
      text: t('A transaction is not counted'),
      detail: reasonText(row),
      fixes: [
        {
          label: t('Open the transactions'),
          onPress: () => navigate('/accounts'),
        },
      ],
    };
  }

  return (
    <View
      role="region"
      aria-label={t('Needs attention')}
      style={{
        gap: 6,
        padding: 10,
        borderRadius: 4,
        border: `1px solid ${items.length > 0 ? theme.warningBorder : theme.tableBorder}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <Text style={{ fontWeight: 600 }}>
        {t('Needs attention ({{count}})', { count: items.length })}
      </Text>
      {items.length === 0 ? (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>Nothing needs attention.</Trans>
        </Text>
      ) : (
        <View role="list" style={{ gap: 6 }}>
          {items.map(item => {
            const { text, detail, fixes } = describe(item);
            return (
              <View
                key={item.key}
                role="listitem"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ flex: '1 1 220px' }}>
                  {text}
                  {detail !== undefined && (
                    <Text style={{ color: theme.pageTextSubdued }}>
                      {' '}
                      ({detail})
                    </Text>
                  )}
                </Text>
                {fixes.map(fix => (
                  <Button
                    key={fix.label}
                    isDisabled={mutation.isPending}
                    onPress={fix.onPress}
                  >
                    {fix.label}
                  </Button>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
