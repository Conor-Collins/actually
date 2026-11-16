import type { CSSProperties } from '@actual-app/components/styles';

import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';

type MoneyProps = {
  amount: number;
  style?: CSSProperties;
};

export function Money({ amount, style }: MoneyProps) {
  const format = useFormat();

  return (
    <FinancialText style={style}>
      <PrivacyFilter>{format(amount, 'financial')}</PrivacyFilter>
    </FinancialText>
  );
}
