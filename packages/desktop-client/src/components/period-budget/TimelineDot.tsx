import type { CSSProperties } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { DOT_SIZE, percent } from './layout';

type TimelineDotProps = {
  position: number; // on the axis, from 0 to 1
  center: number; // from the top of the track, in pixels
  label: string;
  isHollow?: boolean;
  color?: string;
  onClick?: () => void;
};

// A day on the timeline: solid for a payment, hollow for an expected charge.
export function TimelineDot({
  position,
  center,
  label,
  isHollow = false,
  color = theme.pageTextDark,
  onClick,
}: TimelineDotProps) {
  const style: CSSProperties = {
    position: 'absolute',
    left: percent(position),
    width: DOT_SIZE,
    height: DOT_SIZE,
    boxSizing: 'border-box',
    borderRadius: DOT_SIZE,
    // Its middle is on its day
    marginLeft: -DOT_SIZE / 2,
    pointerEvents: 'auto',

    top: center - DOT_SIZE / 2,
    // The ring keeps a solid dot visible on the filled part of a bar
    border: isHollow
      ? `2px solid ${color}`
      : `1px solid ${theme.tableBackground}`,
    backgroundColor: isHollow ? theme.tableBackground : color,
  };

  if (onClick) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        style={{ ...style, padding: 0, cursor: 'pointer' }}
      />
    );
  }

  return <Text role="img" aria-label={label} title={label} style={style} />;
}
