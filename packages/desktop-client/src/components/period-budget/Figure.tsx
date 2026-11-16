import type { ReactNode } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Money } from './Money';

type FigureProps = {
  label: string;
  // Null when the figure could not be calculated
  amount: number | null;
  children?: ReactNode;
};

// One of the header's figures: its label, the amount, and a note under it.
export function Figure({ label, amount, children }: FigureProps) {
  return (
    <View role="group" aria-label={label} style={{ minWidth: 180, gap: 2 }}>
      <Text style={{ color: theme.pageTextSubdued, fontSize: 13 }}>
        {label}
      </Text>
      {amount === null ? (
        <Text style={{ fontSize: 22, fontWeight: 600 }}>—</Text>
      ) : (
        <Money
          amount={amount}
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: amount < 0 ? theme.errorText : theme.pageTextDark,
          }}
        />
      )}
      {children && (
        <Text style={{ color: theme.pageTextSubdued, fontSize: 12 }}>
          {children}
        </Text>
      )}
    </View>
  );
}
