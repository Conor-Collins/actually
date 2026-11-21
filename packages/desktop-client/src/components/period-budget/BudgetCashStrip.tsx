import { useId, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';
import { useNavigate } from '#hooks/useNavigate';
import type { PeriodBudgetView } from '#period-budget';

import { periodBudgetLink, useBudgetPeriodMonth } from './BudgetPeriods';
import { lineStyle } from './layout';
import { Money } from './Money';
import { NeedsAttention } from './NeedsAttention';
import { useCashForecast } from './useCashForecast';
import { usePeriodBudgetLabels } from './usePeriodBudgetLabels';

export function BudgetCashStrip({ month }: { month: string }) {
  const monthly = useBudgetPeriodMonth(month);
  if (!monthly || monthly.data.view === null) {
    return null;
  }
  return <CashStrip monthly={monthly} view={monthly.data.view} />;
}

function CashStrip({
  monthly,
  view,
}: {
  monthly: NonNullable<ReturnType<typeof useBudgetPeriodMonth>>;
  view: PeriodBudgetView;
}) {
  const { t } = useTranslation();
  const summaryId = useId();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data, asOf } = monthly;
  const labels = usePeriodBudgetLabels();
  const { forecast } = useCashForecast(data);
  const shortfalls =
    forecast?.accounts.filter(account => account.firstShortfallDate !== null) ??
    [];
  const { inAccounts, owed } = view.figures;
  if (inAccounts === null && owed === null && view.attention.length === 0) {
    return null;
  }

  const shortfallSummary = t('Shortfalls ({{count}})', {
    count: shortfalls.length,
  });
  const attentionSummary = t('Needs attention ({{count}})', {
    count: view.attention.length,
  });
  const summary = [
    inAccounts === null
      ? null
      : t('In accounts {{amount}}', { amount: labels.spokenMoney(inAccounts) }),
    owed === null
      ? null
      : t('Owed {{amount}}', { amount: labels.spokenMoney(owed) }),
    forecast === null ? null : shortfallSummary,
    attentionSummary,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={{
        margin: '5px',
        border: `1px solid ${theme.tableBorder}`,
        borderRadius: 4,
        backgroundColor: theme.tableBackground,
        flexShrink: 0,
      }}
    >
      <Button
        variant="bare"
        aria-expanded={isOpen}
        aria-label={t('Cash and period budget alerts')}
        aria-describedby={summaryId}
        onPress={() => setIsOpen(!isOpen)}
        style={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          padding: '6px 10px',
        }}
      >
        <Text id={summaryId} style={styles.visuallyHidden}>
          {summary}
        </Text>
        <Text
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '4px 12px',
          }}
        >
          {inAccounts !== null && (
            <Text>
              <Trans>In accounts</Trans> <Money amount={inAccounts} />
            </Text>
          )}
          {owed !== null && (
            <Text>
              <Trans>Owed</Trans> <Money amount={owed} />
            </Text>
          )}
          {forecast !== null && (
            <Text
              style={{
                color:
                  shortfalls.length > 0
                    ? theme.errorText
                    : theme.pageTextSubdued,
              }}
            >
              {shortfallSummary}
            </Text>
          )}
          <Text>{attentionSummary}</Text>
          <SvgCheveronDown
            width={12}
            height={12}
            style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
          />
        </Text>
      </Button>
      {isOpen && (
        <View
          style={{
            padding: 10,
            gap: 8,
            maxHeight: '35vh',
            overflowY: 'auto',
            borderTop: `1px solid ${theme.tableBorder}`,
          }}
        >
          <View style={lineStyle}>
            <Text>{t('As of {{date}}', { date: labels.day(asOf) })}</Text>
            <Link variant="internal" to={periodBudgetLink(asOf)}>
              <Trans>Open full Period Budget</Trans>
            </Link>
          </View>
          {shortfalls.map(
            account =>
              account.firstShortfallDate !== null && (
                <View
                  key={account.accountId}
                  style={{ ...lineStyle, color: theme.errorText }}
                >
                  <Text>
                    {t('{{account}} is short from {{date}}', {
                      account: data.accountName(account.accountId),
                      date: labels.day(account.firstShortfallDate),
                    })}
                  </Text>
                  <Money amount={account.transferNeeded} />
                </View>
              ),
          )}
          <NeedsAttention
            view={view}
            data={data}
            labels={labels}
            onOpenCategory={categoryId =>
              void navigate(periodBudgetLink(asOf, categoryId))
            }
          />
        </View>
      )}
    </View>
  );
}
