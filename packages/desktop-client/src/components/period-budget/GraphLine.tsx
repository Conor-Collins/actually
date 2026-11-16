import { View } from '@actual-app/components/view';

import { percent } from './layout';

// The lines of a graph, made of level parts and steps. Places are parts of
// the width and the height of the box the line is in.

type LineStyle = {
  color: string;
  thickness?: number;
  isDashed?: boolean;
  testId?: string;
};

type LineRunProps = LineStyle & {
  from: number;
  to: number;
  y: number;
};

export function LineRun({
  from,
  to,
  y,
  color,
  thickness = 2,
  isDashed = false,
  testId,
}: LineRunProps) {
  return (
    <View
      aria-hidden
      data-testid={testId}
      style={{ position: 'absolute', height: 0, pointerEvents: 'none' }}
      nativeStyle={{
        left: percent(from),
        width: percent(to - from),
        top: percent(y),
        marginTop: -thickness / 2,
        borderTop: `${thickness}px ${isDashed ? 'dashed' : 'solid'} ${color}`,
      }}
    />
  );
}

type LineRiseProps = LineStyle & {
  x: number;
  fromY: number;
  toY: number;
};

export function LineRise({
  x,
  fromY,
  toY,
  color,
  thickness = 2,
  isDashed = false,
  testId,
}: LineRiseProps) {
  return (
    <View
      aria-hidden
      data-testid={testId}
      style={{ position: 'absolute', width: 0, pointerEvents: 'none' }}
      nativeStyle={{
        left: percent(x),
        top: percent(Math.min(fromY, toY)),
        height: percent(Math.abs(toY - fromY)),
        marginLeft: -thickness / 2,
        borderLeft: `${thickness}px ${isDashed ? 'dashed' : 'solid'} ${color}`,
      }}
    />
  );
}
