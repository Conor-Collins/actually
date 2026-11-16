import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { DOT_SIZE, percent } from './layout';

type TimelineDotProps = {
  position: number; // on the axis, from 0 to 1
  center: number; // from the top of the track, in pixels
  label: string;
  isHollow?: boolean;
  color?: string;
};

// A day on the timeline: solid for a payment, hollow for an expected charge.
export function TimelineDot({
  position,
  center,
  label,
  isHollow = false,
  color = theme.pageTextDark,
}: TimelineDotProps) {
  return (
    <View
      role="img"
      aria-label={label}
      style={{
        position: 'absolute',
        width: DOT_SIZE,
        height: DOT_SIZE,
        boxSizing: 'border-box',
        borderRadius: DOT_SIZE,
        // Its middle is on its day
        marginLeft: -DOT_SIZE / 2,
        // A press on a dot reaches the bar under it
        pointerEvents: 'none',
      }}
      nativeStyle={{
        left: percent(position),
        top: center - DOT_SIZE / 2,
        // The ring keeps a solid dot visible on the filled part of a bar
        border: isHollow
          ? `2px solid ${color}`
          : `1px solid ${theme.tableBackground}`,
        backgroundColor: isHollow ? theme.tableBackground : color,
      }}
    />
  );
}
