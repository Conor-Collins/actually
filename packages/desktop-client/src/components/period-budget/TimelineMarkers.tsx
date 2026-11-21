import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { useResizeObserver } from '#hooks/useResizeObserver';

import { percent } from './layout';
import { TimelineDot } from './TimelineDot';

export type TimelineMarker = {
  id: string;
  position: number;
  label: string;
  isHollow?: boolean;
  color?: string;
  onClick?: () => void;
};

const MARKER_WIDTH = 18;

export function clusterTimelineMarkers(
  markers: TimelineMarker[],
  width: number,
) {
  const spacing = Math.min(1, MARKER_WIDTH / Math.max(width, 1));
  const clusters: [TimelineMarker, ...TimelineMarker[]][] = [];
  for (const marker of [...markers].sort((a, b) => a.position - b.position)) {
    const cluster = clusters.at(-1);
    const previous = cluster?.at(-1);
    if (cluster && previous && marker.position - previous.position < spacing) {
      cluster.push(marker);
    } else {
      clusters.push([marker]);
    }
  }
  return clusters;
}

export function TimelineMarkers({
  markers,
  center,
  inset = 9,
}: {
  markers: TimelineMarker[];
  center: number;
  inset?: number;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(360);
  const ref = useResizeObserver<HTMLSpanElement>(entry =>
    setWidth(entry.width),
  );
  if (markers.length === 0) {
    return null;
  }

  return (
    <Text
      innerRef={ref}
      style={{
        position: 'absolute',
        inset: `0 ${inset}px`,
        pointerEvents: 'none',
      }}
    >
      {clusterTimelineMarkers(markers, width).map(cluster => {
        const first = cluster[0];
        if (cluster.length === 1) {
          return <TimelineDot key={first.id} center={center} {...first} />;
        }
        const position =
          cluster.reduce((sum, marker) => sum + marker.position, 0) /
          cluster.length;
        const label = cluster.map(marker => marker.label).join('\n');
        return (
          <Text
            key={first.id}
            role="img"
            aria-label={label}
            title={label}
            onClick={first.onClick}
            style={{
              position: 'absolute',
              width: MARKER_WIDTH,
              height: 14,
              borderRadius: 8,
              border: `1px solid ${theme.tableBackground}`,
              backgroundColor: theme.pageTextDark,
              color: theme.tableBackground,
              fontSize: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              left: percent(position),
              top: center - 7,
              transform: 'translateX(-50%)',
            }}
          >
            <span aria-hidden>
              {cluster.length < 100 ? cluster.length : t('99+')}
            </span>
          </Text>
        );
      })}
    </Text>
  );
}
