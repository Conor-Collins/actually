import type { ReactNode } from 'react';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

type PanelSectionProps = {
  title: string;
  children: ReactNode;
};

export function PanelSection({ title, children }: PanelSectionProps) {
  return (
    <View role="group" aria-label={title} style={{ gap: 6 }}>
      <Text style={{ fontWeight: 600 }}>{title}</Text>
      {children}
    </View>
  );
}
