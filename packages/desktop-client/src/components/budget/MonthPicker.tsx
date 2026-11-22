import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronLeft,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as months from '@actual-app/core/shared/months';

import { useLocale } from '#hooks/useLocale';

import type { MonthBounds } from './MonthsContext';

type MonthPickerProps = {
  startMonth: string;
  numDisplayed: number;
  monthBounds: MonthBounds;
  style?: CSSProperties;
  onSelect: (month: string) => void;
};

const arrowStyle = { width: 32, height: 32, padding: 0, flexShrink: 0 };

export function MonthPicker({
  startMonth,
  numDisplayed,
  monthBounds,
  style,
  onSelect,
}: MonthPickerProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const trigger = useRef<HTMLButtonElement>(null);
  const [year, setYear] = useState<number | null>(null);
  const currentMonth = months.currentMonth();
  const first = monthBounds.start;
  const last = months.subMonths(monthBounds.end, numDisplayed - 1);
  const lastDisplayed = months.addMonths(startMonth, numDisplayed - 1);
  const headline = months.format(startMonth, 'MMMM yyyy', locale);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, ...style }}
    >
      <Button
        onPress={() => onSelect(currentMonth)}
        style={{
          borderRadius: 24,
          paddingInline: 14,
          marginRight: 8,
          flexShrink: 0,
        }}
      >
        <Trans>Today</Trans>
      </Button>
      <Button
        variant="bare"
        aria-label={t('Previous month')}
        isDisabled={startMonth <= first}
        style={arrowStyle}
        onPress={() => onSelect(months.prevMonth(startMonth))}
      >
        <View title={t('Previous month')}>
          <SvgCheveronLeft width={16} height={16} />
        </View>
      </Button>
      <Button
        variant="bare"
        aria-label={t('Next month')}
        isDisabled={startMonth >= last}
        style={arrowStyle}
        onPress={() => onSelect(months.nextMonth(startMonth))}
      >
        <View title={t('Next month')}>
          <SvgCheveronRight width={16} height={16} />
        </View>
      </Button>
      <Button
        ref={trigger}
        data-testid="selected-budget-month"
        data-month={startMonth}
        variant="bare"
        aria-expanded={year !== null}
        aria-haspopup="dialog"
        onPress={() => setYear(Number(months.getYear(startMonth)))}
        style={{
          fontSize: 20,
          justifyContent: 'flex-start',
          textAlign: 'left',
        }}
      >
        {headline}
      </Button>
      {months
        .rangeInclusive(startMonth, lastDisplayed)
        .slice(1)
        .map(month => (
          <span
            key={month}
            style={styles.visuallyHidden}
            data-testid="selected-budget-month"
            data-month={month}
          >
            {months.format(month, 'MMM', locale)}
          </span>
        ))}
      <Popover
        triggerRef={trigger}
        isOpen={year !== null}
        onOpenChange={open => {
          if (!open) setYear(null);
        }}
      >
        {year !== null && (
          <View style={{ padding: 8, gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button
                variant="bare"
                aria-label={t('Previous year')}
                isDisabled={year <= Number(months.getYear(first))}
                onPress={() => setYear(year - 1)}
              >
                <SvgCheveronLeft width={16} height={16} />
              </Button>
              {year}
              <Button
                variant="bare"
                aria-label={t('Next year')}
                isDisabled={year >= Number(months.getYear(last))}
                onPress={() => setYear(year + 1)}
              >
                <SvgCheveronRight width={16} height={16} />
              </Button>
            </View>
            <View
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 4,
              }}
            >
              {months.rangeInclusive(`${year}-01`, `${year}-12`).map(month => {
                const selected = month >= startMonth && month <= lastDisplayed;
                return (
                  <Button
                    key={month}
                    variant={selected ? 'primary' : 'bare'}
                    aria-label={months.format(month, 'MMMM yyyy', locale)}
                    aria-current={month === currentMonth ? 'date' : undefined}
                    aria-pressed={selected}
                    isDisabled={month < first || month > last}
                    style={{
                      fontWeight: month === currentMonth ? 700 : undefined,
                      borderColor: theme.tableBorder,
                    }}
                    onPress={() => {
                      onSelect(month);
                      setYear(null);
                    }}
                  >
                    {months.format(month, 'MMM', locale)}
                  </Button>
                );
              })}
            </View>
          </View>
        )}
      </Popover>
    </View>
  );
}
