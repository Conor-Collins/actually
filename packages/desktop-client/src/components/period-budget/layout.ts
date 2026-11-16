import type { CSSProperties } from '@actual-app/components/styles';

// A line of text, amounts and buttons that wraps on a narrow screen.
export const lineStyle: CSSProperties = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 8,
};

// The timeline: the width of the columns left of the axis, and where the
// bars and the dots are in a row.
export const NAME_WIDTH = 170;
export const AMOUNT_WIDTH = 92;
export const TRACK_HEIGHT = 38;
export const BAR_TOP = 4;
export const BAR_HEIGHT = 16;
export const LANE_CENTER = 30; // payments dated outside their period
export const DOT_SIZE = 8;

export function percent(position: number): string {
  return `${Math.round(position * 100000) / 1000}%`;
}
