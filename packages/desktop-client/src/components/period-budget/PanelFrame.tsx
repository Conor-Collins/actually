import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgClose } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type PanelFrameProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// The frame of an opened row.
export function PanelFrame({ title, onClose, children }: PanelFrameProps) {
  const { t } = useTranslation();

  return (
    <View
      role="region"
      aria-label={title}
      style={{
        gap: 14,
        padding: 12,
        borderRadius: 4,
        border: `1px solid ${theme.tableBorderSelected}`,
        backgroundColor: theme.tableBackground,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{title}</Text>
        <Button variant="bare" aria-label={t('Close')} onPress={onClose}>
          <SvgClose width={10} height={10} />
        </Button>
      </View>
      {children}
    </View>
  );
}
