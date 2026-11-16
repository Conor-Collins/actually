import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Money } from './Money';

type LabelledMoneyProps = {
  label: string;
  amount: number;
  isBad?: boolean;
};

// An amount with its label above it.
export function LabelledMoney({
  label,
  amount,
  isBad = false,
}: LabelledMoneyProps) {
  return (
    <View role="group" aria-label={label} style={{ gap: 1 }}>
      <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
        {label}
      </Text>
      <Money
        amount={amount}
        style={{ color: isBad ? theme.errorText : theme.pageText }}
      />
    </View>
  );
}
