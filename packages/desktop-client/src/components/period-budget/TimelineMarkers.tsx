import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Popover } from '@actual-app/components/popover';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

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
        return (
          <ClusterMarker key={first.id} cluster={cluster} center={center} />
        );
      })}
    </Text>
  );
}

function ClusterMarker({
  cluster,
  center,
}: {
  cluster: TimelineMarker[];
  center: number;
}) {
  const { t } = useTranslation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const position =
    cluster.reduce((sum, marker) => sum + marker.position, 0) / cluster.length;
  const label = cluster.map(marker => marker.label).join('\n');
  const count = cluster.length < 100 ? cluster.length : t('99+');
  const badgeStyle: CSSProperties = {
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
  };

  if (!cluster.some(marker => marker.onClick !== undefined)) {
    return (
      <Text role="img" aria-label={label} title={label} style={badgeStyle}>
        <span aria-hidden>{count}</span>
      </Text>
    );
  }

  const menuLabel = t('Timeline markers ({{count}})', {
    count: cluster.length,
  });

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        bounce={false}
        aria-label={menuLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onPress={() => setIsOpen(!isOpen)}
        style={{ ...badgeStyle, padding: 0 }}
      >
        <Text
          aria-hidden
          title={label}
          style={{ position: 'absolute', inset: 0 }}
        >
          {count}
        </Text>
      </Button>
      <Popover triggerRef={triggerRef} isOpen={isOpen} onOpenChange={setIsOpen}>
        {isOpen && (
          <ClusterMenu
            cluster={cluster}
            label={menuLabel}
            onClose={() => setIsOpen(false)}
          />
        )}
      </Popover>
    </>
  );
}

function ClusterMenu({
  cluster,
  label,
  onClose,
}: {
  cluster: TimelineMarker[];
  label: string;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus();
  }, []);

  return (
    <View
      innerRef={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={moveMenuFocus}
      style={{
        padding: 4,
        maxWidth: 'min(420px, 85vw)',
        maxHeight: '50vh',
        overflowY: 'auto',
      }}
    >
      {cluster.map(marker => (
        <button
          key={marker.id}
          type="button"
          role="menuitem"
          tabIndex={-1}
          disabled={marker.onClick === undefined}
          className={menuItemStyle}
          onClick={() => {
            onClose();
            marker.onClick?.();
          }}
        >
          {marker.label}
        </button>
      ))}
    </View>
  );
}

function moveMenuFocus(event: KeyboardEvent<HTMLDivElement>) {
  const { key, currentTarget, target } = event;
  if (
    key !== 'ArrowDown' &&
    key !== 'ArrowUp' &&
    key !== 'Home' &&
    key !== 'End'
  ) {
    return;
  }

  const items = Array.from(
    currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  );
  if (items.length === 0) {
    return;
  }

  event.preventDefault();
  const current = items.findIndex(item => item === target);
  switch (key) {
    case 'Home':
      items[0]?.focus();
      break;
    case 'End':
      items.at(-1)?.focus();
      break;
    case 'ArrowDown':
      items[(current + 1) % items.length]?.focus();
      break;
    case 'ArrowUp':
      items[(current - 1 + items.length) % items.length]?.focus();
      break;
    default:
      break;
  }
}

const menuItemStyle = css({
  border: 0,
  borderRadius: 4,
  padding: '6px 8px',
  backgroundColor: 'transparent',
  color: theme.menuItemText,
  textAlign: 'left',
  overflowWrap: 'anywhere',
  '&:disabled': { color: theme.buttonBareDisabledText },
  '&:enabled:hover, &:focus-visible': {
    backgroundColor: theme.menuItemBackgroundHover,
    color: theme.menuItemTextHover,
  },
});
