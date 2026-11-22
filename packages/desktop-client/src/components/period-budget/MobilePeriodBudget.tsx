import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { findRow, monthOf } from '#period-budget';
import type { CategoryRowView, PeriodBudgetView } from '#period-budget';

import { AsOfControls } from './AsOfControls';
import { LabelledMoney } from './LabelledMoney';
import { lineStyle } from './layout';
import { MobileAccounts } from './MobileAccounts';
import { MobilePeriodBar } from './MobilePeriodBar';
import { Money } from './Money';
import { NeedsAttention } from './NeedsAttention';
import { OpenedRow } from './OpenedRow';
import { PeriodBudgetFigures } from './PeriodBudgetFigures';
import type { Selection } from './selection';
import type { PeriodBudgetData } from './usePeriodBudgetData';
import type { PeriodBudgetLabels } from './usePeriodBudgetLabels';

type MobilePeriodBudgetProps = {
  view: PeriodBudgetView;
  asOf: string;
  onAsOfChange: (asOf: string) => void;
  data: PeriodBudgetData;
  labels: PeriodBudgetLabels;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
};

const TAB_IDS = ['month', 'periods', 'accounts'] as const;

type TabId = (typeof TAB_IDS)[number];

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  paddingBottom: 20,
};

function tabStyle({ isSelected }: { isSelected: boolean }): CSSProperties {
  return {
    flex: 1,
    padding: '8px 0',
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: isSelected ? 600 : 400,
    color: isSelected ? theme.pageTextDark : theme.pageTextSubdued,
    borderBottom: `2px solid ${isSelected ? theme.tableBorderSelected : theme.tableBorder}`,
  };
}

// The page on a phone: "Month" has the figures and the month's payments,
// "Periods" has a short bar for each category and opens a period in place,
// "Accounts" has the cash forecast of each selected account.
export function MobilePeriodBudget({
  view,
  asOf,
  onAsOfChange,
  data,
  labels,
  selection,
  onSelect,
}: MobilePeriodBudgetProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>(selection ? 'periods' : 'month');
  const openRow = selection ? findRow(view, selection.categoryId) : null;

  function openPeriodOf(row: CategoryRowView) {
    const active = row.activePeriod;
    onSelect({
      categoryId: row.category.id,
      period: active
        ? { id: active.period.id, start: active.period.start }
        : null,
    });
  }

  return (
    <Tabs
      selectedKey={tab}
      onSelectionChange={key =>
        setTab(TAB_IDS.find(id => id === key) ?? 'month')
      }
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <TabList aria-label={t('Period Budget')} style={{ display: 'flex' }}>
        <Tab id="month" style={tabStyle}>
          <Trans>Month</Trans>
        </Tab>
        <Tab id="periods" style={tabStyle}>
          <Trans>Periods</Trans>
        </Tab>
        <Tab id="accounts" style={tabStyle}>
          <Trans>Accounts</Trans>
        </Tab>
      </TabList>

      <TabPanel id="month" style={panelStyle}>
        <AsOfControls asOf={asOf} onAsOfChange={onAsOfChange} labels={labels} />
        <PeriodBudgetFigures view={view} labels={labels} isNarrow />
        <NeedsAttention
          view={view}
          data={data}
          labels={labels}
          onOpenCategory={categoryId => {
            onSelect({ categoryId, period: null });
            setTab('periods');
          }}
        />
        <View
          role="group"
          aria-label={t('Payments in {{month}}', {
            month: labels.month(monthOf(view.asOf)),
          })}
          style={{ gap: 6 }}
        >
          <Text style={{ fontWeight: 600 }}>
            {t('Payments in {{month}}', {
              month: labels.month(monthOf(view.asOf)),
            })}
          </Text>
          {view.monthPayments.length === 0 ? (
            <Text style={{ color: theme.pageTextSubdued }}>
              <Trans>No payment in this month.</Trans>
            </Text>
          ) : (
            <View role="list" style={{ gap: 6 }}>
              {view.monthPayments.map(payment => (
                <View key={payment.id} role="listitem" style={lineStyle}>
                  <Text>{labels.day(payment.date)}</Text>
                  <Text style={{ flex: '1 1 100px' }}>
                    {data.payeeName(payment.payee)}
                  </Text>
                  <Text style={{ color: theme.pageTextSubdued }}>
                    {data.categoryName(payment.category)}
                  </Text>
                  <Money amount={payment.amount} />
                </View>
              ))}
            </View>
          )}
        </View>
      </TabPanel>

      <TabPanel id="periods" style={panelStyle}>
        {selection && openRow ? (
          <OpenedRow
            row={openRow}
            period={selection.period}
            asOf={view.asOf}
            data={data}
            labels={labels}
            onSelect={onSelect}
          />
        ) : (
          view.groups.map(({ group, rows }) => (
            <View
              key={group.id}
              role="group"
              aria-label={group.name}
              style={{ gap: 6 }}
            >
              <Text style={{ fontWeight: 600 }}>{group.name}</Text>
              {rows.map(row => {
                const active = row.activePeriod;
                return (
                  <Button
                    key={row.category.id}
                    variant="bare"
                    onPress={() => openPeriodOf(row)}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 4,
                      minWidth: 0,
                      padding: 10,
                      textAlign: 'left',
                      backgroundColor: theme.tableBackground,
                    }}
                  >
                    <View
                      style={{ ...lineStyle, justifyContent: 'space-between' }}
                    >
                      <Text
                        style={{
                          minWidth: 0,
                          overflowWrap: 'anywhere',
                          fontWeight: 600,
                        }}
                      >
                        {row.category.name}
                      </Text>
                      {active && (
                        <Text style={{ color: theme.pageTextSubdued }}>
                          {labels.period(active.period)}
                        </Text>
                      )}
                    </View>
                    {active && (
                      <>
                        <MobilePeriodBar
                          view={active}
                          asOf={view.asOf}
                          labels={labels}
                        />
                        <View style={{ ...lineStyle, gap: 24 }}>
                          <LabelledMoney
                            label={t('Remaining')}
                            amount={active.remaining}
                            isBad={active.remaining < 0}
                          />
                          <LabelledMoney
                            label={t('Expected remaining')}
                            amount={active.expectedRemaining}
                            isBad={active.expectedRemaining < 0}
                          />
                        </View>
                      </>
                    )}
                  </Button>
                );
              })}
            </View>
          ))
        )}
      </TabPanel>

      <TabPanel id="accounts" style={panelStyle}>
        <MobileAccounts asOf={view.asOf} data={data} labels={labels} />
      </TabPanel>
    </Tabs>
  );
}
