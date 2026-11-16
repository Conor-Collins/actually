import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { AMOUNT_WIDTH } from './layout';
import { Money } from './Money';

type AmountCellProps = {
  amount: number;
  isBad?: boolean;
};

// An amount in one of the timeline's columns. The column's header names it.
export function AmountCell({ amount, isBad = false }: AmountCellProps) {
  return (
    <View
      role="cell"
      style={{
        width: AMOUNT_WIDTH,
        flexShrink: 0,
        alignItems: 'flex-end',
        paddingRight: 10,
      }}
    >
      <Money
        amount={amount}
        style={{ color: isBad ? theme.errorText : theme.pageText }}
      />
    </View>
  );
}
