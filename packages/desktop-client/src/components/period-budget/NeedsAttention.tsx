import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { useNavigate } from '#hooks/useNavigate';
import { usePeriodBudgetMutation } from '#period-budget';
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
        detail: row.detail,
        fixes,
      };
    }
    if (row.table === 'period_offsets') {
      return {
        text: t('The period chosen for a payment is not used'),
        detail: row.detail,
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
      return {
        text: t('A change to a scheduled charge has no charge on its date'),
        detail: row.detail,
        fixes: [
          {
            label: t('Remove the change'),
            onPress: () =>
              write({
                name: 'period-budget/clear-charge-override',
                args: { id: row.id },
              }),
          },
        ],
      };
    }
    if (row.table === 'charges') {
      return {
        text: t('A scheduled charge is not counted'),
        detail: row.detail,
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
      detail: row.detail,
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
