import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { percent } from './layout';

type GraphMarkProps = {
  x: number;
  y: number;
  label: string;
  isHollow?: boolean;
  color?: string;
  isSelected: boolean;
  onPress: () => void;
};

const TARGET_SIZE = 20;
const MARK_SIZE = 10;

// A payment or a charge in a graph: solid for a payment, hollow for a charge
// that is expected. It can be chosen, to read its date and amount.
export function GraphMark({
  x,
  y,
  label,
  isHollow = false,
  color = theme.pageTextDark,
  isSelected,
  onPress,
}: GraphMarkProps) {
  return (
    <Button
      variant="bare"
      bounce={false}
      aria-label={label}
      aria-pressed={isSelected}
      onPress={onPress}
      style={{
        position: 'absolute',
        left: percent(x),
        top: percent(y),
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        // Its middle is on its day and its amount
        marginLeft: -TARGET_SIZE / 2,
        marginTop: -TARGET_SIZE / 2,
        padding: 0,
        borderRadius: TARGET_SIZE,
        boxShadow: isSelected
          ? `0 0 0 2px ${theme.tableBorderSelected}`
          : undefined,
      }}
    >
      <View
        aria-hidden
        title={label}
        style={{
          width: MARK_SIZE,
          height: MARK_SIZE,
          boxSizing: 'border-box',
          borderRadius: MARK_SIZE,
        }}
        nativeStyle={{
          border: isHollow
            ? `2px solid ${color}`
            : `1px solid ${theme.tableBackground}`,
          backgroundColor: isHollow ? theme.tableBackground : color,
        }}
      />
    </Button>
  );
}
